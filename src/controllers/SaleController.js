// src/controllers/saleController.js

const { Sale, SaleItem, Product, Customer } = require('../models');
const { v4: uuidv4 } = require('uuid');

// GET semua penjualan
const getAll = async (req, res) => {
  try {
    const sales = await Sale.findAll({
      include: [
        { model: SaleItem, include: [Product] },
        { model: Customer, attributes: ['id', 'name', 'phone'] },
      ],
      order: [['date', 'DESC']],
    });

    res.json({ success: true, data: sales });
  } catch (err) {
    console.error('Error fetching sales:', err);
    res.status(500).json({ success: false, message: 'Gagal mengambil data penjualan' });
  }
};

// GET penjualan berdasarkan ID
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const sale = await Sale.findByPk(id, {
      include: [
        { model: SaleItem, include: [Product] },
        { model: Customer },
      ],
    });

    if (!sale) {
      return res.status(404).json({ success: false, message: 'Penjualan tidak ditemukan' });
    }

    res.json({ success: true, data: sale });
  } catch (err) {
    console.error('Error fetching sale by ID:', err);
    res.status(500).json({ success: false, message: 'Gagal mengambil detail penjualan' });
  }
};

// CREATE penjualan baru
const create = async (req, res) => {
  const t = await Sale.sequelize.transaction();
  try {
    const { customerName, customerId, items } = req.body;

    if (!customerName || !items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Nama pelanggan dan item wajib diisi' });
    }

    let totalAmount = 0;
    const saleItems = [];

    for (const item of items) {
      const product = await Product.findByPk(item.productId, { transaction: t });
      if (!product) {
        throw new Error(`Produk dengan ID ${item.productId} tidak ditemukan`);
      }

      const subtotal = product.price * item.quantity;
      totalAmount += subtotal;

      saleItems.push({
        id: uuidv4(),
        productId: product.id,
        productName: product.name,
        price: product.price,
        quantity: item.quantity,
        subtotal,
      });
    }

    const invoiceNumber = `INV-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(Math.floor(1000 + Math.random() * 9000)).padStart(4, '0')}`;

    const sale = await Sale.create({
      id: uuidv4(),
      invoiceNumber,
      date: new Date(),
      customerId: customerId || null,
      customerName,
      totalAmount,
      status: 'PAID',
    }, { transaction: t });

    await SaleItem.bulkCreate(
      saleItems.map(item => ({ ...item, saleId: sale.id })),
      { transaction: t }
    );

    await t.commit();

    const newSale = await Sale.findByPk(sale.id, {
      include: [
        { model: SaleItem, include: [Product] },
        { model: Customer, attributes: ['id', 'name', 'phone'] },
      ],
    });

    res.status(201).json({
      success: true,
      message: 'Penjualan berhasil dicatat',
      data: newSale,
    });
  } catch (err) {
    await t.rollback();
    console.error('Error creating sale:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Gagal menyimpan penjualan',
    });
  }
};

// UPDATE penjualan (hanya jika status masih PAID atau PENDING)
const update = async (req, res) => {
  const t = await Sale.sequelize.transaction();
  try {
    const { id } = req.params;
    const { customerName, customerId, items } = req.body;

    const sale = await Sale.findByPk(id, { include: [SaleItem] });
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Penjualan tidak ditemukan' });
    }

    if (sale.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Penjualan yang dibatalkan tidak bisa diubah' });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Item penjualan wajib diisi' });
    }

    let totalAmount = 0;
    const newSaleItems = [];

    for (const item of items) {
      const product = await Product.findByPk(item.productId);
      if (!product) {
        throw new Error(`Produk dengan ID ${item.productId} tidak ditemukan`);
      }

      const subtotal = product.price * item.quantity;
      totalAmount += subtotal;

      newSaleItems.push({
        id: item.id || uuidv4(), // jika item lama, pakai ID lama
        saleId: sale.id,
        productId: product.id,
        productName: product.name,
        price: product.price,
        quantity: item.quantity,
        subtotal,
      });
    }

    // Hapus SaleItem lama
    await SaleItem.destroy({ where: { saleId: sale.id }, transaction: t });

    // Buat SaleItem baru
    await SaleItem.bulkCreate(newSaleItems, { transaction: t });

    // Update Sale utama
    await sale.update({
      customerName: customerName || sale.customerName,
      customerId: customerId || sale.customerId,
      totalAmount,
    }, { transaction: t });

    await t.commit();

    const updatedSale = await Sale.findByPk(id, {
      include: [
        { model: SaleItem, include: [Product] },
        { model: Customer, attributes: ['id', 'name', 'phone'] },
      ],
    });

    res.json({
      success: true,
      message: 'Penjualan berhasil diperbarui',
      data: updatedSale,
    });
  } catch (err) {
    await t.rollback();
    console.error('Error updating sale:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Gagal memperbarui penjualan',
    });
  }
};

// SOFT DELETE (ubah status jadi CANCELLED)
const cancel = async (req, res) => {
  try {
    const { id } = req.params;

    const sale = await Sale.findByPk(id);
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Penjualan tidak ditemukan' });
    }

    if (sale.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Penjualan sudah dibatalkan' });
    }

    await sale.update({ status: 'CANCELLED' });

    res.json({
      success: true,
      message: 'Penjualan berhasil dibatalkan',
      data: { status: 'CANCELLED' },
    });
  } catch (err) {
    console.error('Error cancelling sale:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal membatalkan penjualan',
    });
  }
};

// HARD DELETE (hapus permanen - gunakan hati-hati!)
const hardDelete = async (req, res) => {
  const t = await Sale.sequelize.transaction();
  try {
    const { id } = req.params;

    const sale = await Sale.findByPk(id);
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Penjualan tidak ditemukan' });
    }

    // Hapus SaleItem dulu
    await SaleItem.destroy({ where: { saleId: id }, transaction: t });

    // Hapus Sale
    await sale.destroy({ transaction: t });

    await t.commit();

    res.json({
      success: true,
      message: 'Penjualan berhasil dihapus permanen',
    });
  } catch (err) {
    await t.rollback();
    console.error('Error hard deleting sale:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus penjualan',
    });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  cancel,      
  hardDelete,  
};