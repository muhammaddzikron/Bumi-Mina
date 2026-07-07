# 🌸 Panduan Konfigurasi Google Apps Script (Novel Bumi Mina)

Google Apps Script ini dirancang khusus untuk memperindah tampilan spreadsheet Google Sheets Anda secara otomatis dan mengirimkan **notifikasi email instan** setiap kali ada pembaca yang mengirimkan ulasan baru dari aplikasi web Anda.

---

## 🛠️ Langkah-Langkah Pemasangan (Sangat Mudah):

1. **Buka Spreadsheet Anda**:
   * Masuk ke Google Sheets Anda di: [Spreadsheet Bumi Mina](https://docs.google.com/spreadsheets/d/1SexURj6gODO80-qzj9Uv4FG2s9ZzlS1G3SgNJ_MB9IM/edit)

2. **Buka Editor Apps Script**:
   * Pada menu atas spreadsheet, klik **Ekstensi** (Extensions) ➔ **Apps Script**.

3. **Tempelkan (Paste) Kode**:
   * Hapus seluruh kode bawaan yang ada di halaman editor tersebut (biasanya ada fungsi kosong `myFunction()`).
   * Buka file `GoogleAppsScript.gs` yang baru saja saya buat di proyek ini, **salin seluruh isinya**, lalu tempelkan (paste) ke dalam editor Apps Script Google.

4. **Sesuaikan Email Notifikasi**:
   * Cari baris kode ini di bagian atas:
     ```javascript
     const EMAIL_NOTIFIKASI = "muhammaddzikron@gmail.com";
     ```
   * Pastikan alamat email tersebut adalah email aktif Anda untuk menerima laporan ulasan novel terbaru.

5. **Simpan Proyek**:
   * Klik ikon **Simpan** (Disket) di bagian atas editor atau tekan tombol `Ctrl + S` (`Cmd + S` pada Mac).

6. **Berikan Izin & Otorisasi**:
   * Segarkan (refresh) halaman spreadsheet Anda di browser.
   * Menu baru bernama **🌸 Bumi Mina Admin** akan muncul di sebelah kanan menu "Bantuan" (Help).
   * Klik **🌸 Bumi Mina Admin** ➔ **📧 Kirim Test Notifikasi Email**.
   * Google akan meminta izin otorisasi saat pertama kali dijalankan. Klik **Lanjutkan** ➔ **Buka Novel Bumi Mina (tidak aman)** ➔ **Izinkan**.
   * Setelah itu, Anda akan langsung menerima email tes di kotak masuk Anda!

7. **Aktifkan Trigger Otomatis (Opsional, sangat disarankan untuk ulasan instan)**:
   * Agar notifikasi email otomatis terkirim *setiap saat ulasan baru disimpan*, kita buat pemicu (trigger):
     1. Di menu kiri editor Apps Script, klik ikon **Pemicu** (Trigger - berbentuk jam beker ⏰).
     2. Klik tombol **+ Tambahkan Pemicu** (+ Add Trigger) di kanan bawah.
     3. Konfigurasikan seperti berikut:
        * **Pilih fungsi yang ingin dijalankan**: `onEdit`
        * **Pilih penerapan yang akan dijalankan**: `Utama` (Head)
        * **Pilih sumber acara**: `Dari spreadsheet` (From spreadsheet)
        * **Pilih jenis acara**: `Saat diedit` (On edit) atau `Saat ada perubahan` (On change).
     4. Klik **Simpan**.

---

## ✨ Fitur Utama Script Ini:

* **Format Otomatis**: Menyusun baris header dengan warna yang elegan (Emerald/Teal), melebarkan kolom secara otomatis sesuai panjang konten, membekukan (freeze) baris pertama agar rapi saat digulung, serta memberikan text-wrap pada isi cerita dan komentar ulasan.
* **Email Notifikasi Mewah**: Email yang dikirimkan berformat HTML dengan desain hijau syahdu bernuansa novel Bumi Mina lengkap dengan representasi rating bintang (⭐) dari ulasan pembaca Anda.
