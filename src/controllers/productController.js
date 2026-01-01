const { Product, Category, Unit } = require('../models');
const { v4: uuidv4 } = require('uuid');

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Ambil semua produk
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Berhasil mengambil data produk
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 */

// GET semua produk (dengan relasi Category & Unit)
const getAll = async (req, res) => {
  try {
    const products = await Product.findAll({
      include: [
        { model: Category, attributes: ['id', 'name'] },
        { model: Unit, attributes: ['id', 'name', 'fullName'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      data: products,
    });
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data produk',
    });
  }
};

// GET produk berdasarkan ID
const getById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id, {
      include: [
        { model: Category, attributes: ['id', 'name'] },
        { model: Unit, attributes: ['id', 'name', 'fullName'] },
      ],
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produk tidak ditemukan',
      });
    }

    res.json({
      success: true,
      data: product,
    });
  } catch (err) {
    console.error('Error fetching product by ID:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil detail produk',
    });
  }
};

// CREATE produk baru
const create = async (req, res) => {
  try {
    const {
      code,
      name,
      price,
      stock = 0,
      description,
      thumbnail,
      origin,
      status = 'ACTIVE',
      categoryId,
      unitId,
    } = req.body;

    // Validasi wajib
    if (!code || !name || !price || !categoryId || !unitId) {
      return res.status(400).json({
        success: false,
        message: 'Code, name, price, categoryId, dan unitId wajib diisi',
      });
    }

    const product = await Product.create({
      id: uuidv4(),
      code,
      name,
      price,
      stock,
      description: description || null,
      thumbnail: thumbnail || null,
      origin: origin || null,
      status,
      categoryId,
      unitId,
    });

    // Ambil data lengkap setelah create (dengan relasi)
    const newProduct = await Product.findByPk(product.id, {
      include: [Category, Unit],
    });

    res.status(201).json({
      success: true,
      message: 'Produk berhasil ditambahkan',
      data: newProduct,
    });
  } catch (err) {
    console.error('Error creating product:', err);

    // Tangkap error unik (misal code sudah ada)
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Kode produk sudah digunakan',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Gagal menambahkan produk',
    });
  }
};

// UPDATE produk
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produk tidak ditemukan',
      });
    }

    await product.update(updateData);

    // Ambil data terbaru
    const updatedProduct = await Product.findByPk(id, {
      include: [Category, Unit],
    });

    res.json({
      success: true,
      message: 'Produk berhasil diperbarui',
      data: updatedProduct,
    });
  } catch (err) {
    console.error('Error updating product:', err);

    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Kode produk sudah digunakan',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Gagal memperbarui produk',
    });
  }
};

// DELETE produk (soft delete dengan ubah status jadi INACTIVE)
const softDelete = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produk tidak ditemukan',
      });
    }

    await product.update({ status: 'INACTIVE' });

    res.json({
      success: true,
      message: 'Produk berhasil dinonaktifkan',
    });
  } catch (err) {
    console.error('Error soft deleting product:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal menonaktifkan produk',
    });
  }
};

// DELETE permanen (hard delete) - gunakan dengan hati-hati
const hardDelete = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produk tidak ditemukan',
      });
    }

    await product.destroy();

    res.json({
      success: true,
      message: 'Produk berhasil dihapus permanen',
    });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus produk',
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