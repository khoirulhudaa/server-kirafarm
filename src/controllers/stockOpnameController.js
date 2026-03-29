const { randomUUID } = require('crypto');
const { StockOpname, Product, sequelize } = require('../models');

const createOpname = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { productId, actualStock, note } = req.body;
    const sellerId = req.user.sellerId;
    const userName = req.user.name || 'Admin';

    // 1. Cari produknya
    const product = await Product.findByPk(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });

    const prevStock = product.stock;
    const diff = actualStock - prevStock;
    const type = diff >= 0 ? 'PLUS' : 'MINUS';

    // 2. Buat record Opname
    const opname = await StockOpname.create({
      id: randomUUID(),
      productId,
      sellerId,
      previousStock: prevStock,
      actualStock: actualStock,
      difference: diff,
      adjustmentType: type,
      note: note || '-',
      userName: userName
    }, { transaction: t });

    // 3. Update Stok di tabel Product
    await product.update({ stock: actualStock }, { transaction: t });

    // Commit jika semua lancar
    await t.commit();

    // Ambil data lengkap dengan relasi produk untuk dikirim ke frontend
    const result = await StockOpname.findByPk(opname.id, {
      include: [{ model: Product, as: 'product', attributes: ['name', 'code', 'unitId'] }]
    });

    res.status(201).json({ success: true, message: 'Stok opname berhasil dicatat', data: result });
  } catch (err) {
    await t.rollback();
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal memproses stok opname' });
  }
};

const getAllOpnames = async (req, res) => {
  try {
    const { sellerId } = req.user;
    const data = await StockOpname.findAll({
      where: { sellerId },
      include: [{ model: Product, as: 'product', attributes: ['name', 'code'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil riwayat opname' });
  }
};

module.exports = { createOpname, getAllOpnames };