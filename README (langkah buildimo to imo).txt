=====================================================================
README - PANDUAN SINKRONISASI BUILDIMO -> IMO
Biar tidak ketuker ID Sheet / URL Apps Script antara environment
testing (BUILDIMO) dan environment produksi (IMO)
=====================================================================

1. KONSEP DASAR
---------------------------------------------------------------------
- IMO       = environment PRODUKSI (data asli petugas, jangan sampai
              rusak/ketiban data testing).
- BUILDIMO  = environment TESTING (tempat coba-coba fitur baru,
              boleh berantakan, aman untuk eksperimen).
- Struktur file JS/HTML/CSS di kedua repo ini SAMA PERSIS. Yang
  membedakan HANYA 4 nilai konfigurasi di bawah ini (Bagian 2).
- Alur kerja: kembangkan & uji fitur di BUILDIMO -> kalau sudah FIX
  -> pindahkan KODE-nya saja ke IMO, TAPI 4 nilai konfigurasi
  tetap pakai punya IMO (jangan ikut ketimpa punya buildimo).


2. EMPAT NILAI YANG WAJIB BEDA (JANGAN PERNAH DISAMAKAN)
---------------------------------------------------------------------
A. File: imo/assets/js/config.js
   - APPS_SCRIPT_URL   -> URL deployment Web App Apps Script
   - DRIVE_ROOT_FOLDER -> nama folder root di Google Drive

B. File: apps-script/Code.gs
   - SPREADSHEET_ID           -> ID Google Sheet (database)
   - DRIVE_ROOT_FOLDER_DEFAULT -> nama folder root default di Drive

   ------------------------------------------------------------------
   NILAI SAAT INI (per file yang di-upload):
   ------------------------------------------------------------------
   IMO (PRODUKSI):
     SPREADSHEET_ID (Code.gs)      : 1hXqmE_NiVhm2P4dN7wRg0bMKRFj2wAhgwsYr9RVTirM
     DRIVE_ROOT_FOLDER_DEFAULT     : IMO_2026
     APPS_SCRIPT_URL (config.js)   : https://script.google.com/macros/s/AKfycbyPd0fyxJpy8vWpzj9GBg1-1nENo9Nqq-SfjH3rpm55c1Iy23HiduSNzwYJSt-ikwY4/exec
     DRIVE_ROOT_FOLDER (config.js) : IMO_2026
     Repo GitHub                   : dev-kaiops9/imo.git

   BUILDIMO (TESTING):
     SPREADSHEET_ID (Code.gs)      : 1ZKk5onw1DiWK5qP5tPRlPLUzkiRHMOFLBxwljJboAqE
     DRIVE_ROOT_FOLDER_DEFAULT     : BUILDIMO_2026
     APPS_SCRIPT_URL (config.js)   : >> BELUM DIUBAH, masih sama dgn IMO di atas <<
     DRIVE_ROOT_FOLDER (config.js) : >> BELUM DIUBAH, masih "IMO_2026" <<
     Repo GitHub                   : dev-kaiops9/buildimo.git

   ⚠️ ACTION ITEM SEKARANG JUGA:
   config.js di buildimo MASIH mengarah ke Apps Script & folder Drive
   milik IMO produksi. Kalau buildimo sudah live/dipakai testing
   sebelum ini dibetulkan, data testing bisa nyasar/nyampur ke data
   produksi IMO. Yang harus dilakukan:
     1) Deploy Code.gs buildimo (yang SPREADSHEET_ID-nya sudah beda)
        sebagai Web App baru di project Apps Script buildimo -> akan
        dapat URL /exec yang BARU.
     2) Tempel URL baru itu ke APPS_SCRIPT_URL di config.js buildimo.
     3) Ubah DRIVE_ROOT_FOLDER di config.js buildimo jadi "BUILDIMO_2026"
        (samakan dengan DRIVE_ROOT_FOLDER_DEFAULT di Code.gs-nya).


3. FILE APA SAJA YANG "AMAN" DISALIN MENTAH DARI BUILDIMO KE IMO
---------------------------------------------------------------------
Boleh copy-paste APA ADANYA (tidak mengandung ID/URL spesifik):
   [OK] imo/index.html
   [OK] imo/per-bulan.html
   [OK] imo/assets/css/style.css
   [OK] imo/assets/js/api.js
   [OK] imo/assets/js/bulanan.js
   [OK] imo/assets/js/form.js
   [OK] imo/assets/js/main.js
   [OK] imo/assets/js/pdf.js
   [OK] imo/assets/js/preview.js
   [OK] imo/assets/js/upload.js

WAJIB DI-CEK MANUAL, JANGAN COPY MENTAH-MENTAH:
   [!!] imo/assets/js/config.js
        -> pindahkan HANYA bagian fitur/logic barunya (mis. OPTIONS,
           MAPPING, getTableColumns, dsb). JANGAN timpa nilai
           APPS_SCRIPT_URL dan DRIVE_ROOT_FOLDER dengan punya buildimo.
   [!!] apps-script/Code.gs
        -> pindahkan HANYA fungsi/logic baru. JANGAN timpa nilai
           SPREADSHEET_ID dan DRIVE_ROOT_FOLDER_DEFAULT dengan punya
           buildimo.


4. LANGKAH PORTING FITUR: BUILDIMO -> IMO (SETELAH FITUR FIX)
---------------------------------------------------------------------
1) Buka file yang mau dipindah dari buildimo, salin bagian kode fitur
   barunya saja.
2) Buka file yang SAMA di repo imo.
3) Kalau file itu ADA di daftar "aman" (Bagian 3) -> tempel/replace
   seluruh isinya langsung.
4) Kalau file itu config.js atau Code.gs -> tempel HANYA bagian
   logic/fitur baru, lalu screenshot/cek ulang bahwa 4 nilai di
   Bagian 2 (SPREADSHEET_ID, DRIVE_ROOT_FOLDER_DEFAULT,
   APPS_SCRIPT_URL, DRIVE_ROOT_FOLDER) MASIH nilai punya IMO, bukan
   buildimo.
5) Kalau Code.gs imo ikut berubah (ada fungsi baru), deploy ulang
   sebagai "New deployment" versi baru di Apps Script project IMO
   (bukan project buildimo!). Jika sengaja pakai "Manage deployments
   > Edit" pada deployment lama, pastikan tetap di project IMO.
6) Test dulu dari GitHub Pages/preview sebelum push ke branch main
   repo dev-kaiops9/imo.git.
7) Commit & push ke repo IMO. Jangan pernah push perubahan config.js/
   Code.gs versi buildimo ke repo imo tanpa mengecek ulang Bagian 2.


5. CATATAN TAMBAHAN
---------------------------------------------------------------------
- Update tabel di Bagian 2 setiap kali URL deployment Apps Script
  IMO atau BUILDIMO berubah (misal re-deploy Web App baru), supaya
  README ini selalu jadi rujukan yang akurat.
- Simpan file ini di root masing-masing repo (imo/ dan buildimo/)
  supaya gampang dicek kapan saja tanpa buka Apps Script editor.
=====================================================================