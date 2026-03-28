const { randomUUID } = require('crypto');
const { Seller } = require('../models');
const cloudinary = require('cloudinary').v2;

const streamUpload = (fileBuffer, folderName) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `sellers/${folderName}` },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    stream.end(fileBuffer);
  });
};

const registerSeller = async (req, res) => {
  try {
    const { 
      nama, nik, namaToko, slug, alamat, 
      deskripsi, bank, bankCode, rekening, 
      namaRekening, whatsapp, email 
    } = req.body;

    // Ambil ID dari user yang sedang login (harus sudah BUYER)
    const userId = req.user.id; 

    // 1. Cek apakah user ini sudah pernah mendaftar seller (biar tidak double)
    const alreadySeller = await Seller.findOne({ where: { userId } });
    if (alreadySeller) {
      return res.status(400).json({ success: false, message: 'Anda sudah terdaftar sebagai seller' });
    }

    // 2. Validasi Dasar & Slug (tetap sama seperti kode Anda)
    if (!nama || !nik || !namaToko || !slug) {
      return res.status(400).json({ success: false, message: 'Data wajib belum lengkap' });
    }

   // 3. Proses Upload ke Cloudinary (Jika ada file)
    let ktpUrl = null;
    let selfieKtpUrl = null;
    let produkUrl = null;

    if (req.files) {
      if (req.files['ktp']) {
        const resKtp = await streamUpload(req.files['ktp'][0].buffer, 'identity');
        ktpUrl = resKtp.secure_url;
      }
      if (req.files['selfieKtp']) {
        const resSelfie = await streamUpload(req.files['selfieKtp'][0].buffer, 'identity');
        selfieKtpUrl = resSelfie.secure_url;
      }
      if (req.files['produk']) {
        const resProduk = await streamUpload(req.files['produk'][0].buffer, 'samples');
        produkUrl = resProduk.secure_url;
      }
    }

    // 4. Simpan ke Database dengan menyertakan userId
    const newSeller = await Seller.create({
      id: randomUUID(),
      userId: userId, // HUBUNGKAN KE TABEL USER
      nama,
      nik,
      fotoKtp: ktpUrl,
      fotoSelfieKtp: selfieKtpUrl,
      namaToko,
      slug,
      alamat,
      deskripsi,
      bank,
      bankCode,
      rekening,
      namaRekening,
      whatsapp,
      email,
      status: 'PENDING' // Butuh approval admin untuk berubah jadi ACTIVE
    });

    res.status(201).json({ 
      success: true, 
      message: 'Pengajuan seller berhasil. Tunggu verifikasi admin.', 
      data: newSeller 
    });

  } catch (err) {
    console.error('Seller registration error:', err);
    res.status(500).json({ 
        success: false, 
        message: 'Gagal memproses pendaftaran',
        debug: err.message, // Kirim pesan error asli ke browser
        stack: err.errors ? err.errors.map(e => e.message) : null // Detail error Sequelize
    });
  }
};

module.exports = { registerSeller };