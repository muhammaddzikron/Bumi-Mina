/**
 * GOOGLE APPS SCRIPT CONFIGURATION FOR NOVEL BUMI MINA
 * Spreadsheet: https://docs.google.com/spreadsheets/d/1SexURj6gODO80-qzj9Uv4FG2s9ZzlS1G3SgNJ_MB9IM/edit
 * 
 * Cara Penggunaan:
 * 1. Buka spreadsheet Anda di browser.
 * 2. Klik menu "Ekstensi" (Extensions) -> "Apps Script".
 * 3. Hapus kode bawaan (jika ada), lalu tempelkan (paste) seluruh kode di bawah ini.
 * 4. Ganti email tujuan di variabel `EMAIL_NOTIFIKASI` di bawah dengan email Anda.
 * 5. Klik tombol Simpan (ikon disket) di bagian atas Apps Script.
 * 6. Jalankan fungsi `onOpen` sekali atau segarkan (refresh) halaman spreadsheet Anda.
 * 7. Menu baru bernama "🌸 Bumi Mina Admin" akan muncul di menu atas spreadsheet Anda!
 */

// Ganti dengan email Anda untuk menerima notifikasi ulasan baru
const EMAIL_NOTIFIKASI = "muhammaddzikron@gmail.com";

/**
 * Membuat menu kustom saat spreadsheet dibuka
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🌸 Bumi Mina Admin')
    .addItem('✨ Atur Format & Rapikan Tampilan', 'formatSpreadsheet')
    .addItem('📧 Kirim Test Notifikasi Email', 'kirimTestEmail')
    .addToUi();
}

/**
 * Memformat spreadsheet secara otomatis agar memiliki visual yang profesional
 * sesuai tema warna novel Bumi Mina (Emerald / Hijau Syahdu & Slate).
 */
function formatSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetsInfo = [
    {
      name: 'Bab Novel',
      headers: ['ID', 'Nomor', 'Judul', 'Subjudul', 'Ringkasan', 'Gambar URL', 'Status Kunci', 'Jumlah Halaman', 'Isi Cerita (Gabungan Halaman)'],
      color: '#065f46', // Emerald Gelap
      textColor: '#ffffff'
    },
    {
      name: 'Ulasan Pembaca',
      headers: ['ID Ulasan', 'ID Bab', 'Nama Pembaca', 'Rating (1-5)', 'Komentar', 'Tanggal'],
      color: '#0f766e', // Teal Gelap
      textColor: '#ffffff'
    },
    {
      name: 'Bookmark',
      headers: ['ID Bab', 'Halaman Terakhir (1-Indexed)'],
      color: '#0369a1', // Biru Langit Malam
      textColor: '#ffffff'
    }
  ];

  sheetsInfo.forEach(info => {
    let sheet = ss.getSheetByName(info.name);
    if (!sheet) {
      // Buat jika tidak ada
      sheet = ss.insertSheet(info.name);
    }

    // Tulis Header jika kosong atau belum lengkap
    const lastCol = info.headers.length;
    const headerRange = sheet.getRange(1, 1, 1, lastCol);
    headerRange.setValues([info.headers]);

    // Format Header
    headerRange.setBackground(info.color);
    headerRange.setFontColor(info.textColor);
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');
    headerRange.setVerticalAlignment('middle');
    headerRange.setFontFamily('Georgia');
    headerRange.setFontSize(10);

    // Format Grid & Data
    const maxRows = sheet.getMaxRows();
    const dataRange = sheet.getRange(1, 1, maxRows, lastCol);
    dataRange.setFontFamily('Roboto');
    dataRange.setFontSize(10);
    
    // Set wrapping untuk kolom deskripsi/komentar agar teks panjang rapi
    sheet.getRange(2, 1, maxRows - 1, lastCol).setWrap(true);
    
    // Auto-fit ukuran kolom
    for (let col = 1; col <= lastCol; col++) {
      // Khusus isi cerita dibatasi lebarnya agar tidak terlalu memanjang
      if (info.name === 'Bab Novel' && col === 9) {
        sheet.setColumnWidth(col, 400);
      } else if (info.name === 'Ulasan Pembaca' && col === 5) {
        sheet.setColumnWidth(col, 300);
      } else {
        sheet.autoResizeColumn(col);
      }
    }

    // Bekukan baris pertama agar tidak ikut tergulung (freeze)
    sheet.setFrozenRows(1);
  });

  SpreadsheetApp.getUi().alert('✨ Sukses!', 'Spreadsheet berhasil dirapikan dengan tema visual Bumi Mina!', SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * Trigger otomatis ketika ada perubahan data (seperti ulasan baru masuk)
 */
function onChange(e) {
  // Hanya jalankan jika ada baris baru dimasukkan (INSERT_ROW)
  if (e.changeType === 'INSERT_ROW') {
    handleNewRowNotification();
  }
}

/**
 * Alternatif trigger edit biasa untuk menangkap ulasan baru yang ditambahkan dari web
 */
function onEdit(e) {
  const range = e.range;
  const sheet = range.getSheet();
  
  // Jika ada ulasan baru masuk di sheet "Ulasan Pembaca"
  if (sheet.getName() === 'Ulasan Pembaca' && range.getRow() > 1) {
    // Jalankan pengecekan ulasan baru
    const rowNum = range.getRow();
    kirimNotifikasiUlasan(sheet, rowNum);
  }
}

/**
 * Mengirimkan email notifikasi ulasan baru
 */
function kirimNotifikasiUlasan(sheet, rowNum) {
  try {
    const idUlasan = sheet.getRange(rowNum, 1).getValue();
    const babId = sheet.getRange(rowNum, 2).getValue();
    const namaPembaca = sheet.getRange(rowNum, 3).getValue();
    const rating = sheet.getRange(rowNum, 4).getValue();
    const komentar = sheet.getRange(rowNum, 5).getValue();
    const tanggal = sheet.getRange(rowNum, 6).getValue();

    // Validasi data agar tidak mengirim email kosong
    if (!namaPembaca || !komentar) return;

    // Supaya tidak mengirim duplikat, tandai baris yang sudah diproses
    const cache = CacheService.getScriptCache();
    const cacheKey = "notif_" + rowNum + "_" + idUlasan;
    if (cache.get(cacheKey)) return; // Sudah dikirim
    cache.put(cacheKey, "sent", 1800); // Simpan selama 30 menit

    const subjek = `💌 Ulasan Baru: Novel Bumi Mina dari ${namaPembaca} (Rating: ${rating}/5)`;
    
    // Template Email HTML yang sangat indah
    const htmlBody = `
      <div style="font-family: 'Georgia', serif; background-color: #fcfbf9; padding: 30px; border: 1px solid #e5e5e5; max-width: 600px; margin: 0 auto; border-radius: 12px; color: #333333;">
        <div style="text-align: center; border-bottom: 2px solid #065f46; padding-bottom: 15px; margin-bottom: 25px;">
          <h2 style="color: #065f46; margin: 0; font-size: 22px;">📖 Novel Bumi Mina</h2>
          <p style="font-size: 12px; color: #666666; margin: 5px 0 0 0; font-style: italic;">Catatan Perjalanan & Kisah Sang Salik</p>
        </div>
        
        <p style="font-size: 14px; line-height: 1.6;">Halo Penulis,</p>
        <p style="font-size: 14px; line-height: 1.6;">Alhamdulillah, seseorang telah mengirimkan ulasan baru pada karya Anda!</p>
        
        <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; border-radius: 4px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="padding: 4px 0; font-weight: bold; width: 120px; color: #065f46;">Pembaca</td>
              <td style="padding: 4px 0; color: #333333;">: ${namaPembaca}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: bold; color: #065f46;">Rating</td>
              <td style="padding: 4px 0; color: #b45309; font-weight: bold;">: ${"⭐".repeat(Math.min(5, Math.max(1, rating)))} (${rating}/5)</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: bold; color: #065f46;">Tanggal</td>
              <td style="padding: 4px 0; color: #333333;">: ${tanggal || new Date().toLocaleString("id-ID")}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0 4px 0; font-weight: bold; color: #065f46; vertical-align: top;" colspan="2">Komentar/Saran:</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #1e293b; font-style: italic; font-size: 14px; line-height: 1.6;" colspan="2">
                "${komentar}"
              </td>
            </tr>
          </table>
        </div>
        
        <p style="font-size: 12px; color: #666666; line-height: 1.5;">
          Data ini disimpan secara aman di Google Sheets Anda. Anda dapat merespons ulasan atau memperbarui naskah secara langsung melalui panel admin di website aplikasi.
        </p>

        <div style="text-align: center; margin-top: 30px; border-top: 1px solid #eeeeee; padding-top: 15px;">
          <a href="https://docs.google.com/spreadsheets/d/1SexURj6gODO80-qzj9Uv4FG2s9ZzlS1G3SgNJ_MB9IM/edit" style="background-color: #065f46; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 12px; display: inline-block;">
            Buka Spreadsheet Utama ↗
          </a>
        </div>
      </div>
    `;

    MailApp.sendEmail({
      to: EMAIL_NOTIFIKASI,
      subject: subjek,
      htmlBody: htmlBody
    });
  } catch (err) {
    console.error("Gagal mengirim email notifikasi: ", err);
  }
}

/**
 * Endpoint Web App (doPost)
 * Menerima kiriman ulasan baru dari aplikasi web secara instan tanpa perlu login Google
 */
function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Ulasan Pembaca');
    if (!sheet) {
      sheet = ss.insertSheet('Ulasan Pembaca');
      sheet.getRange(1, 1, 1, 6).setValues([['ID Ulasan', 'ID Bab', 'Nama Pembaca', 'Rating (1-5)', 'Komentar', 'Tanggal']]);
    }
    
    const idUlasan = params.id || ("rev-" + Date.now());
    const chapterId = params.chapterId || "unknown";
    const name = params.name || "Anonim";
    const rating = Number(params.rating) || 5;
    const comment = params.comment || "";
    const timestamp = params.timestamp || new Date().toISOString().slice(0, 16).replace("T", " ");

    const rowData = [idUlasan, chapterId, name, rating, comment, timestamp];
    sheet.appendRow(rowData);
    
    // Kirim email notifikasi instan
    const lastRow = sheet.getLastRow();
    kirimNotifikasiUlasan(sheet, lastRow);

    return ContentService.createTextOutput(JSON.stringify({ 
      status: 'success', 
      message: 'Ulasan berhasil disimpan ke Google Sheets!',
      data: rowData 
    })).setMimeType(ContentService.MimeType.JSON)
       .setHeader('Access-Control-Allow-Origin', '*');

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: 'error', 
      message: err.toString() 
    })).setMimeType(ContentService.MimeType.JSON)
       .setHeader('Access-Control-Allow-Origin', '*');
  }
}

/**
 * Endpoint Web App (doGet)
 * Untuk memverifikasi koneksi aktif
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    message: 'Koneksi ke Web App Bumi Mina berhasil aktif!'
  })).setMimeType(ContentService.MimeType.JSON)
     .setHeader('Access-Control-Allow-Origin', '*');
}

/**
 * Fungsi pembantu untuk mengetes pengiriman email manual
 */
function kirimTestEmail() {
  try {
    const htmlBody = `
      <div style="font-family: 'Georgia', serif; background-color: #fcfbf9; padding: 30px; border: 1px solid #e5e5e5; max-width: 600px; margin: 0 auto; border-radius: 12px; color: #333333;">
        <div style="text-align: center; border-bottom: 2px solid #065f46; padding-bottom: 15px; margin-bottom: 25px;">
          <h2 style="color: #065f46; margin: 0; font-size: 22px;">📖 Novel Bumi Mina</h2>
          <p style="font-size: 12px; color: #666666; margin: 5px 0 0 0; font-style: italic;">Tes Integrasi Google Apps Script</p>
        </div>
        <p style="font-size: 14px; line-height: 1.6; color: #15803d; font-weight: bold; text-align: center;">
          ✓ Koneksi Apps Script Berhasil Dikonfigurasi!
        </p>
        <p style="font-size: 13px; line-height: 1.5; text-align: center; color: #666666;">
          Email ini adalah tes untuk memastikan Google Apps Script pada Spreadsheet <strong>Bumi Mina</strong> sudah siap mengirimkan notifikasi ulasan otomatis ke email Anda.
        </p>
      </div>
    `;

    MailApp.sendEmail({
      to: EMAIL_NOTIFIKASI,
      subject: "🔔 [TEST OK] Bumi Mina Google Apps Script Berhasil Terkoneksi",
      htmlBody: htmlBody
    });

    SpreadsheetApp.getUi().alert('📧 Email Tes Terkirim!', 'Silakan cek kotak masuk email: ' + EMAIL_NOTIFIKASI + ' untuk memastikan email tes masuk.', SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (err) {
    SpreadsheetApp.getUi().alert('❌ Gagal Mengirim Email', err.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}
