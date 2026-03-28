const { randomUUID } = require('crypto');
const { Category } = require('../models');

// GET semua kategori (hanya yang ACTIVE by default)
const getAll = async (req, res) => {
  try {
    // Ambil sellerId dari query params: /categories?sellerId=xxx
    const { sellerId } = req.query;

    // Default filter: hanya yang ACTIVE
    const whereCondition = { status: 'ACTIVE' };

    // Jika sellerId disertakan di params, tambahkan ke filter WHERE
    if (sellerId) {
      whereCondition.sellerId = sellerId;
    }

    const categories = await Category.findAll({
      where: whereCondition, 
      attributes: ['id', 'name', 'description', 'status', 'sellerId', 'createdAt', 'updatedAt'],
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      count: categories.length, // Tambahan info jumlah data
      data: categories,
    });
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Gagal mengambil data kategori',
    });
  }
};
// GET kategori berdasarkan ID
const getById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByPk(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Kategori tidak ditemukan',
      });
    }

    res.json({
      success: true,
      data: category,
    });
  } catch (err) {
    console.error('Error fetching category by ID:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil detail kategori',
    });
  }
};

// CREATE kategori baru
const create = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Nama kategori wajib diisi',
      });
    }

    const category = await Category.create({
      id: randomUUID(),
      name,
      description: description || null,
      status: 'ACTIVE',
    });

    res.status(201).json({
      success: true,
      message: 'Kategori berhasil ditambahkan',
      data: category,
    });
  } catch (err) {
    console.error('Error creating category:', err);

    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Nama kategori sudah digunakan',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Gagal menambahkan kategori',
    });
  }
};

// UPDATE kategori
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status } = req.body;

    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Kategori tidak ditemukan',
      });
    }

    await category.update({
      name: name || category.name,
      description: description !== undefined ? description : category.description,
      status: status || category.status,
    });

    const updatedCategory = await Category.findByPk(id);

    res.json({
      success: true,
      message: 'Kategori berhasil diperbarui',
      data: updatedCategory,
    });
  } catch (err) {
    console.error('Error updating category:', err);

    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Nama kategori sudah digunakan',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Gagal memperbarui kategori',
    });
  }
};

// SOFT DELETE kategori
const softDelete = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Kategori tidak ditemukan',
      });
    }

    await category.update({ status: 'INACTIVE' });

    res.json({
      success: true,
      message: 'Kategori berhasil dinonaktifkan',
    });
  } catch (err) {
    console.error('Error soft deleting category:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal menonaktifkan kategori',
    });
  }
};

// HARD DELETE kategori (opsional, gunakan hati-hati)
const hardDelete = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Kategori tidak ditemukan',
      });
    }

    await category.destroy();

    res.json({
      success: true,
      message: 'Kategori berhasil dihapus permanen',
    });
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus kategori',
    });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  softDelete,
  hardDelete,
};