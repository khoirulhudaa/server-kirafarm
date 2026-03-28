const { randomUUID } = require('crypto');
const { Seller, User } = require('../models');
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

// 1. Ambil semua data seller (untuk Admin)
const getAllSellers = async (req, res) => {
  try {
    const sellers = await Seller.findAll({
      order: [['createdAt', 'DESC']],
      include: [{
        model: User,
        as: 'account', // Pastikan di Model Seller.associate sudah pakai alias 'account'
        attributes: ['id', 'name', 'email', 'role']
      }]
    });

    return res.status(200).json({
      success: true,
      message: 'Berhasil mengambil daftar pendaftaran seller',
      data: sellers
    });

  } catch (err) {
    // Log error di console server (VPS) untuk debugging
    console.error('Error [getAllSellers]:', err);

    // Kirim respons error yang detail ke client
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data seller dari server',
      error: {
        name: err.name, // Contoh: SequelizeDatabaseError atau SequelizeConnectionError
        message: err.message, // Pesan error spesifik (misal: "column user.username does not exist")
        // Detail tambahan jika error berasal dari validasi database (Sequelize)
        details: err.errors ? err.errors.map(e => e.message) : null 
      }
    });
  }
};

// 2. Update Status (Approve / Reject)
const updateSellerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'APPROVED' atau 'REJECTED'

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status tidak valid' });
    }

    const seller = await Seller.findByPk(id);
    if (!seller) {
      return res.status(404).json({ success: false, message: 'Seller tidak ditemukan' });
    }

    // Jika status diubah menjadi APPROVED, update role USER-nya
    if (status === 'APPROVED') {
      await User.update(
        { role: 'SELLER' }, // Ubah role user menjadi SELLER agar bisa akses dashboard seller
        { where: { id: seller.userId } }
      );
    }

    // Update status di tabel Seller
    seller.status = status;
    await seller.save();

    res.status(200).json({
      success: true,
      message: `Seller berhasil ${status === 'APPROVED' ? 'disetujui' : 'ditolak'}`,
      data: seller
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal update status seller' });
  }
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

module.exports = { getAllSellers, updateSellerStatus, registerSeller };