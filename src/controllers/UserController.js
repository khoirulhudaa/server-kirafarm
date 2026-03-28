const { User, Seller } = require('../models');
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');

const SALT_ROUNDS = 10;

// CREATE user baru (hanya OWNER/ADMIN)
const create = async (req, res) => {
  try {
    const { name, email, phone, password, role = 'STAFF' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, dan password wajib diisi',
      });
    }

    // Cek email sudah ada
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email sudah terdaftar',
      });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await User.create({
      id: randomUUID(),
      name,
      email,
      phone: phone || null,
      password: hashedPassword,
      role,
      status: 'ACTIVE',
    });

    const { password: _, ...userWithoutPassword } = user.toJSON();

    res.status(201).json({
      success: true,
      message: 'User berhasil dibuat',
      data: userWithoutPassword,
    });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal membuat user',
    });
  }
};

// UPDATE profile user (nama, phone, email)
const updateProfile = async (req, res) => {
  try {
    const { id } = req.params; // atau req.user.id jika dari token
    const { name, email, phone } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan',
      });
    }

    // Cek email baru sudah dipakai orang lain
    if (email && email !== user.email) {
      const existing = await User.findOne({ where: { email } });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Email sudah digunakan oleh user lain',
        });
      }
    }

    await user.update({
      name: name || user.name,
      email: email || user.email,
      phone: phone !== undefined ? phone : user.phone,
    });

    const { password: _, ...updatedUser } = user.toJSON();

    res.json({
      success: true,
      message: 'Profil berhasil diperbarui',
      data: updatedUser,
    });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal memperbarui profil',
    });
  }
};

// UPDATE Profile Lengkap (User + Seller)
const updateProfileFull = async (req, res) => {
  const t = await User.sequelize.transaction(); // Inisialisasi Transaksi
  try {
    const { id } = req.params;
    const { 
      name, 
      phone, 
      namaToko, 
      whatsapp, 
      alamat, 
      deskripsi, 
      bank, 
      rekening, 
      namaRekening 
    } = req.body;

    // 1. Cari User
    const user = await User.findByPk(id, { transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    }

    // 2. Update Tabel User
    await user.update({
      name: name || user.name,
      phone: phone !== undefined ? phone : user.phone,
    }, { transaction: t });

    // 3. Jika Role adalah SELLER, Update Tabel Seller
    if (user.role === 'SELLER') {
      const seller = await Seller.findOne({ where: { userId: id }, transaction: t });
      
      if (seller) {
        await seller.update({
          namaToko: namaToko || seller.namaToko,
          whatsapp: whatsapp || seller.whatsapp,
          alamat: alamat || seller.alamat,
          deskripsi: deskripsi || seller.deskripsi,
          bank: bank || seller.bank,
          rekening: rekening || seller.rekening,
          namaRekening: namaRekening || seller.namaRekening,
          // Generate slug otomatis jika nama toko berubah
          slug: namaToko ? namaToko.toLowerCase().replace(/[^a-z0-9]/g, '-') : seller.slug
        }, { transaction: t });
      }
    }

    // Commit transaksi jika semua berhasil
    await t.commit();

    // 4. Ambil data terbaru untuk dikirim balik ke frontend
   const updatedUser = await User.findByPk(id, {
      attributes: { exclude: ['password'] }
    });

    let finalData = updatedUser.toJSON();

    if (updatedUser.role === 'SELLER') {
      // Ambil data seller secara manual agar strukturnya identik dengan getUserProfile
      const sellerData = await Seller.findOne({ where: { userId: id } });
      finalData.seller = sellerData; 
    }

    res.json({
      success: true,
      message: 'Profil dan data bisnis berhasil diperbarui',
      data: finalData, // Sekarang strukturnya 100% sama dengan getUserProfile
    });

  } catch (err) {
    // Rollback jika ada error di tengah jalan
    await t.rollback();
    console.error('Error updating full profile:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal memperbarui profil lengkap',
      error: err.message
    });
  }
};

// UPDATE password
const updatePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password lama dan baru wajib diisi',
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan',
      });
    }

    // Verifikasi password lama
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Password lama salah',
      });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await user.update({ password: hashedNewPassword });

    res.json({
      success: true,
      message: 'Password berhasil diubah',
    });
  } catch (err) {
    console.error('Error updating password:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal mengubah password',
    });
  }
};

// SOFT DELETE (ubah status jadi INACTIVE) - hanya OWNER/ADMIN
const softDelete = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan',
      });
    }

    // Tidak boleh deactivate diri sendiri atau OWNER utama (opsional)
    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Tidak bisa menonaktifkan akun sendiri',
      });
    }

    await user.update({ status: user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' });

    res.json({
      success: true,
      message: `User berhasil ${user.status === 'ACTIVE' ? 'diaktifkan kembali' : 'dinonaktifkan'}`,
      data: { status: user.status },
    });
  } catch (err) {
    console.error('Error soft deleting user:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal mengubah status user',
    });
  }
};

// GET all users (hanya ADMIN/OWNER)
const getAll = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      data: users,
    });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data user',
    });
  }
};

// GET user by ID
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan',
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil detail user',
    });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Cari user dulu
    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User tidak ditemukan" });
    }

    // 2. Jika role adalah SELLER, ambil data detail dari tabel Seller
    let profileData = user.toJSON();
    if (user.role === 'SELLER') {
      const sellerData = await Seller.findOne({ where: { userId: id } });
      profileData.seller = sellerData;
    }

    res.json({ success: true, data: profileData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  create,
  updateProfile,
  updatePassword,
  softDelete,
  getAll,
  getById,
  getUserProfile,
  updateProfileFull
};