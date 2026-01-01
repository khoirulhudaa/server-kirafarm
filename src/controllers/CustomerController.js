const { Customer } = require('../models');
const { v4: uuidv4 } = require('uuid');

// GET semua customer
const getAll = async (req, res) => {
  try {
    const customers = await Customer.findAll({
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      data: customers,
    });
  } catch (err) {
    console.error('Error fetching customers:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data pelanggan',
    });
  }
};

// GET customer berdasarkan ID
const getById = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findByPk(id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Pelanggan tidak ditemukan',
      });
    }

    res.json({
      success: true,
      data: customer,
    });
  } catch (err) {
    console.error('Error fetching customer by ID:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil detail pelanggan',
    });
  }
};

// CREATE customer baru
const create = async (req, res) => {
  try {
    const { name, phone, email, address, notes } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Nama dan nomor telepon wajib diisi',
      });
    }

    const customer = await Customer.create({
      id: uuidv4(),
      name,
      phone,
      email: email || null,
      address: address || null,
      notes: notes || null,
    });

    res.status(201).json({
      success: true,
      message: 'Pelanggan berhasil ditambahkan',
      data: customer,
    });
  } catch (err) {
    console.error('Error creating customer:', err);

    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Nomor telepon sudah terdaftar',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Gagal menambahkan pelanggan',
    });
  }
};

// UPDATE customer
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const customer = await Customer.findByPk(id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Pelanggan tidak ditemukan',
      });
    }

    await customer.update(updateData);

    const updatedCustomer = await Customer.findByPk(id);

    res.json({
      success: true,
      message: 'Pelanggan berhasil diperbarui',
      data: updatedCustomer,
    });
  } catch (err) {
    console.error('Error updating customer:', err);

    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Nomor telepon sudah terdaftar',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Gagal memperbarui pelanggan',
    });
  }
};

// DELETE customer (hard delete karena tidak ada field status)
const destroy = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findByPk(id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Pelanggan tidak ditemukan',
      });
    }

    await customer.destroy();

    res.json({
      success: true,
      message: 'Pelanggan berhasil dihapus',
    });
  } catch (err) {
    console.error('Error deleting customer:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus pelanggan',
    });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  destroy, // tidak ada soft delete karena model tidak punya status
};