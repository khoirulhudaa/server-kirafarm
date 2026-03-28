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

exports.getUserProfile = async (req, res) => {
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
  getUserProfile
};