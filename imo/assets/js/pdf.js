/**
 * pdf.js
 * -----------------------------------------------------------------------
 * Membuat dokumen PDF di browser (jsPDF) berisi MURNI tabel serah terima
 * (tanpa judul/keterangan tambahan di atas maupun di bawah tabel), persis
 * seperti struktur kolom yang didefinisikan di CONFIG.getTableColumns()
 * — kolom & posisi yang sama persis dipakai juga oleh preview.js supaya
 * preview dan hasil PDF selalu identik.
 *
 * Dipanggil sebagai Pdf.build(data) dari main.js — foto diambil langsung
 * dari UploadField.state (sudah berisi dataUrl/base64 hasil upload.js).
 * -----------------------------------------------------------------------
 */

const Pdf = {
  /**
   * @param {object} data hasil Form.collect()
   * @returns {Promise<{blob: Blob, base64: string, fileName: string}>}
   */
  async build(data) {
    const photos = UploadField.state;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginX = 12;
    const marginY = 8; // tidak ada header/footer halaman lain, jadi tabel boleh
                       // mepet ke atas & bawah — cuma sisakan margin cetak tipis.
    const tableW = pageW - marginX * 2;
    const rowHeaderH = 12;
    const rowBodyH = pageH - marginY * 2 - rowHeaderH;
    const tableTop = marginY;

    // ---- Struktur kolom (sumber tunggal: CONFIG, sama dengan preview) ----
    const targetKey = CONFIG.getTargetPhotoKey(data.jenisSerahTerima);
    const columns = CONFIG.getTableColumns(data.mapping.tabel, targetKey);
    let x = marginX;
    columns.forEach((c) => {
      c.x = x;
      c.width = tableW * c.w;
      x += c.width;
    });

    // ---- Header tabel ----
    doc.setDrawColor(20, 30, 50);
    doc.setLineWidth(0.3);
    doc.setFillColor(243, 245, 248);
    doc.rect(marginX, tableTop, tableW, rowHeaderH, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    columns.forEach((c) => {
      doc.rect(c.x, tableTop, c.width, rowHeaderH);
      doc.text(c.label, c.x + c.width / 2, tableTop + rowHeaderH / 2 + 1.2, {
        align: "center",
        maxWidth: c.width - 4,
      });
    });

    // ---- Baris body ----
    const bodyTop = tableTop + rowHeaderH;
    columns.forEach((c) => doc.rect(c.x, bodyTop, c.width, rowBodyH));

    const isLibur = data.dinas === CONFIG.DINAS_KHUSUS.LIBUR;
    const LIBUR_COLOR = [239, 68, 68]; // sama dengan --signal-red (#ef4444)

    const tanggalLabel = this._formatTanggalPanjang(data.tanggal);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    columns.forEach((c) => {
      if (c.key === "hari") {
        this._drawCenteredText(doc, tanggalLabel, c, bodyTop, rowBodyH);
      }
      if (c.key === "kegiatan") {
        if (isLibur) {
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...LIBUR_COLOR);
        }
        this._drawCenteredText(doc, data.kegiatan || "", c, bodyTop, rowBodyH);
        if (isLibur) {
          doc.setFont("helvetica", "normal");
          doc.setTextColor(0, 0, 0);
        }
      }
    });

    // ---- Tempatkan foto sesuai mapping ----
    const targetCol = columns.find((c) => c.key === targetKey);
    const dokCol = columns.find((c) => c.key === "dok");

    if (isLibur) {
      // LIBUR: tidak ada foto sama sekali (Serah Terima Dinasan tetap
      // kosong) — kolom Dokumentasi Kegiatan diisi teks "LIBUR" bold merah.
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...LIBUR_COLOR);
      this._drawCenteredText(doc, "LIBUR", dokCol, bodyTop, rowBodyH);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
    } else {
      // Pagi/Siang/Malam & Lainnya: alur foto existing (foto Serah Terima
      // kosong/null untuk Lainnya otomatis membuat kolom "gabung" kosong).
      const croppedSerahTerima = await this._withCroppedDataUrl(photos.fotoSerahTerima);
      const croppedDokumentasi = await this._withCroppedDataUrl(photos.fotoDokumentasi);

      await this._placeImageInCell(doc, croppedSerahTerima, targetCol, bodyTop, rowBodyH);
      await this._placeImageInCell(doc, croppedDokumentasi, dokCol, bodyTop, rowBodyH);
    }

    const fileName = CONFIG.buildPdfFileName(data.tanggal, data.dinas);
    const blob = doc.output("blob");
    const base64 = doc.output("datauristring").split(",")[1];

    return { blob, base64, fileName };
  },

  /**
   * Menulis teks di tengah sel (horizontal & vertikal), memecah ke beberapa
   * baris otomatis kalau tidak muat dalam lebar kolom.
   */
  _drawCenteredText(doc, text, col, bodyTop, rowBodyH) {
    const maxWidth = col.width - 4;
    const lines = doc.splitTextToSize(text || "", maxWidth);
    const fontSize = doc.getFontSize(); // pt
    const lineHeight = (fontSize / doc.internal.scaleFactor) * 1.15; // mm, per baris
    const totalHeight = lines.length * lineHeight;
    const startY = bodyTop + rowBodyH / 2 - totalHeight / 2 + lineHeight * 0.8;

    lines.forEach((line, i) => {
      doc.text(line, col.x + col.width / 2, startY + i * lineHeight, {
        align: "center",
      });
    });
  },

  /**
   * Mengembalikan salinan objek foto dengan dataUrl yang sudah di-crop
   * (ruang putih/kosong di tepi dibuang). Aman dipanggil untuk foto apapun.
   */
  async _withCroppedDataUrl(photo) {
    if (!photo) return photo;
    const cropped = await this._cropWhitespace(photo.dataUrl, photo.mimeType);
    return { ...photo, dataUrl: cropped };
  },

  _cropWhitespace(dataUrl, mimeType) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const SCAN_MAX = 500;
          const scale = Math.min(1, SCAN_MAX / Math.max(img.width, img.height));
          const sw = Math.max(1, Math.round(img.width * scale));
          const sh = Math.max(1, Math.round(img.height * scale));

          const scanCanvas = document.createElement("canvas");
          scanCanvas.width = sw;
          scanCanvas.height = sh;
          const sctx = scanCanvas.getContext("2d");
          if (!sctx) throw new Error("Canvas 2D context tidak tersedia (scan)");
          sctx.drawImage(img, 0, 0, sw, sh);
          const { data } = sctx.getImageData(0, 0, sw, sh);

          const WHITE_THRESHOLD = 238;
          let minX = sw, minY = sh, maxX = -1, maxY = -1;

          for (let y = 0; y < sh; y++) {
            for (let x = 0; x < sw; x++) {
              const i = (y * sw + x) * 4;
              const r = data[i], g = data[i + 1], b = data[i + 2];
              if (r < WHITE_THRESHOLD || g < WHITE_THRESHOLD || b < WHITE_THRESHOLD) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
            }
          }

          if (maxX < 0 || maxY < 0) {
            resolve(dataUrl);
            return;
          }

          const padX = Math.round(sw * 0.01);
          const padY = Math.round(sh * 0.01);
          minX = Math.max(0, minX - padX);
          minY = Math.max(0, minY - padY);
          maxX = Math.min(sw - 1, maxX + padX);
          maxY = Math.min(sh - 1, maxY + padY);

          const coverage = ((maxX - minX) * (maxY - minY)) / (sw * sh);
          if (coverage > 0.97) {
            resolve(dataUrl);
            return;
          }

          const fx = img.width / sw;
          const fy = img.height / sh;
          let cropX = Math.round(minX * fx);
          let cropY = Math.round(minY * fy);
          let cropW = Math.round((maxX - minX) * fx);
          let cropH = Math.round((maxY - minY) * fy);

          const OUTPUT_MAX_DIM = 3000;
          const outScale = Math.min(1, OUTPUT_MAX_DIM / Math.max(cropW, cropH));
          const outW = Math.max(1, Math.round(cropW * outScale));
          const outH = Math.max(1, Math.round(cropH * outScale));

          const outCanvas = document.createElement("canvas");
          outCanvas.width = outW;
          outCanvas.height = outH;
          const octx = outCanvas.getContext("2d");
          if (!octx) throw new Error("Canvas 2D context tidak tersedia (output)");
          octx.fillStyle = "#FFFFFF";
          octx.fillRect(0, 0, outW, outH);
          octx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, outW, outH);

          const outType = mimeType && mimeType.includes("png") ? "image/png" : "image/jpeg";
          const outUrl = outCanvas.toDataURL(outType, 0.95);

          if (!outUrl || outUrl === "data:," || outUrl.length < 50) {
            resolve(dataUrl);
            return;
          }

          resolve(outUrl);
        } catch (e) {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  },

  async _placeImageInCell(doc, photo, col, bodyTop, rowBodyH) {
    if (!photo || !col) return;
    const pad = 4;
    const maxW = col.width - pad * 2;
    const maxH = rowBodyH - pad * 2;

    // Foto di-resize (diperkecil, TIDAK PERNAH diperbesar) supaya resolusi
    // pikselnya pas dengan ukuran sel tabel ini di ~300 DPI cetak — piksel
    // di atas itu tidak pernah kelihatan di ukuran sel sekecil ini, jadi
    // membuangnya tidak membuat foto pecah/blur, cuma memangkas ukuran
    // file PDF (yang sebelumnya jadi berat saat digabung di "Unduh IMO"
    // bulanan). Lihat _resizeForPrint di bawah.
    const dataUrlForPdf = await this._resizeForPrint(photo.dataUrl, photo.mimeType, maxW, maxH);
    const format = photo.mimeType && photo.mimeType.includes("png") ? "PNG" : "JPEG";

    try {
      const props = doc.getImageProperties(dataUrlForPdf);
      const ratio = Math.min(maxW / props.width, maxH / props.height);
      const drawW = props.width * ratio;
      const drawH = props.height * ratio;
      const drawX = col.x + pad + (maxW - drawW) / 2;
      const drawY = bodyTop + pad + (maxH - drawH) / 2;

      doc.addImage(dataUrlForPdf, format, drawX, drawY, drawW, drawH, undefined, "NONE");
    } catch (e) {
      doc.setFontSize(8);
      doc.text("(gambar tidak dapat ditampilkan)", col.x + pad, bodyTop + pad + 6);
    }
  },

  /**
   * Downscale (TIDAK PERNAH upscale) sebuah foto ke resolusi piksel yang
   * sepadan dengan ukuran cetak targetnya (targetWmm x targetHmm di
   * targetDpi), lalu re-encode dengan kualitas JPEG/PNG tinggi. Ini yang
   * memangkas ukuran file PDF secara signifikan tanpa membuat foto
   * terlihat pecah — selama targetDpi cukup tinggi (300 = standar cetak
   * dokumen), mata/printer tidak bisa membedakan hasilnya dari foto
   * resolusi penuh pada ukuran sel tabel ini.
   */
  _resizeForPrint(dataUrl, mimeType, targetWmm, targetHmm, targetDpi = 300, quality = 0.92) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const maxW = Math.max(1, Math.round((targetWmm / 25.4) * targetDpi));
          const maxH = Math.max(1, Math.round((targetHmm / 25.4) * targetDpi));

          if (img.width <= maxW && img.height <= maxH) {
            // Sudah lebih kecil/sama dari kebutuhan cetak — biarkan apa
            // adanya, tidak perlu diproses ulang (dan tidak di-upscale).
            resolve(dataUrl);
            return;
          }

          const scale = Math.min(maxW / img.width, maxH / img.height);
          const outW = Math.max(1, Math.round(img.width * scale));
          const outH = Math.max(1, Math.round(img.height * scale));

          const canvas = document.createElement("canvas");
          canvas.width = outW;
          canvas.height = outH;
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Canvas 2D context tidak tersedia.");
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, outW, outH);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, outW, outH);

          const outType = mimeType && mimeType.includes("png") ? "image/png" : "image/jpeg";
          const outUrl = canvas.toDataURL(outType, quality);
          resolve(outUrl && outUrl !== "data:," ? outUrl : dataUrl);
        } catch (e) {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  },

  _formatTanggalPanjang(isoDate) {
    const d = new Date(isoDate + "T00:00:00");
    const hariList = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const bulanList = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember",
    ];
    const hari = hariList[d.getDay()];
    const tgl = String(d.getDate()).padStart(2, "0");
    const bulan = bulanList[d.getMonth()];
    const tahun = d.getFullYear();
    return `${hari}, ${tgl} ${bulan} ${tahun}`;
  },
};
