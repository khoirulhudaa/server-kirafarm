const { randomUUID } = require('crypto');
const { Sale, SaleItem, Product, Customer } = require('../models');

// GET semua penjualan
const getAll = async (req, res) => {
  try {
    const sales = await Sale.findAll({
      include: [
        { model: SaleItem, include: [Product] },
        // { model: Customer, attributes: ['id', 'name', 'phone'] },
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

const create = async (req, res) => {
  const t = await Sale.sequelize.transaction();
  try {
    const { customerName, customerId, items, shippingAddress } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Keranjang kosong' });
    }

    const saleId = randomUUID();
    const saleItems = [];
    let totalAmount = 0;

    for (const item of items) {
      // 1. Cari produk berdasarkan ID yang dikirim frontend
      const product = await Product.findByPk(item.productId);
      
      // 2. CEK: Jika produk tidak ditemukan, hentikan proses agar tidak error
      if (!product) {
        throw new Error(`Produk dengan ID ${item.productId} tidak ditemukan di database.`);
      }

      // 3. Sekarang aman mengakses .price
      const subtotal = parseFloat(product.price) * item.quantity;
      totalAmount += subtotal;

      saleItems.push({
        id: randomUUID(),
        saleId: saleId,
        productId: product.id,
        // Gunakan data dari database (server-side) bukan dari req.body untuk keamanan harga
        productName: product.name,
        price: product.price,
        quantity: item.quantity,
        subtotal
      });
    }

    // ... Sisa kode create Sale dan bulkCreate SaleItem tetap sama ...
    const sale = await Sale.create({
      id: saleId,
      invoiceNumber: `INV-${Date.now()}`,
      customerName,
      customerId: customerId || null,
      shippingAddress,
      totalAmount,
      shippingCost: 0,
      status: 'RESERVED',
    }, { transaction: t });

    await SaleItem.bulkCreate(saleItems, { transaction: t });
    await t.commit();

    res.status(201).json({ success: true, data: sale });
  } catch (err) {
    if (t) await t.rollback();
    // Berikan pesan error yang lebih jelas ke frontend
    res.status(500).json({ success: false, message: err.message });
  }
};

const update = async (req, res) => {
  const t = await Sale.sequelize.transaction();
  try {
    const { id } = req.params;
    // Ambil semua kemungkinan field dari frontend
    const { 
      customerName, 
      customerId, 
      items, 
      status, 
      shippingCost,
      actualWeights // Jika ada update timbangan saat SHIPPED
    } = req.body;

    // 1. Cari data lama beserta item-nya
    const sale = await Sale.findByPk(id, { include: [SaleItem] });
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Penjualan tidak ditemukan' });
    }

    if (sale.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Penjualan yang dibatalkan tidak bisa diubah' });
    }

    let totalAmount = sale.totalAmount;

    // 2. LOGIKA UPDATE ITEMS (Hanya jika frontend mengirim array items)
    if (items && Array.isArray(items) && items.length > 0) {
      let newTotal = 0;
      const newSaleItems = [];

      for (const item of items) {
        const product = await Product.findByPk(item.productId);
        if (!product) {
          throw new Error(`Produk dengan ID ${item.productId} tidak ditemukan`);
        }

        // Gunakan actualWeight jika statusnya SHIPPED, jika tidak gunakan quantity biasa
        const weight = (actualWeights && actualWeights[item.productId]) 
                        ? actualWeights[item.productId] 
                        : item.quantity;

        const subtotal = product.price * weight;
        newTotal += subtotal;

        newSaleItems.push({
          id: randomUUID(),
          saleId: sale.id,
          productId: product.id,
          productName: product.name,
          price: product.price,
          quantity: weight,
          subtotal,
        });

        // OPTIONAL: Logika potong stok jika status berubah ke SHIPPED
        if (status === 'SHIPPED' && sale.status !== 'SHIPPED') {
          if (product.stock < weight) {
             throw new Error(`Stok produk ${product.name} tidak mencukupi`);
          }
          await product.update({ stock: product.stock - weight }, { transaction: t });
        }
      }

      // Hapus yang lama, ganti yang baru
      await SaleItem.destroy({ where: { saleId: sale.id }, transaction: t });
      await SaleItem.bulkCreate(newSaleItems, { transaction: t });
      totalAmount = newTotal;
    }

    // 3. UPDATE DATA UTAMA (SALE)
    // Menggunakan nilai baru jika ada, jika tidak gunakan nilai lama (existing)
    await sale.update({
      customerName: customerName || sale.customerName,
      customerId: customerId || sale.customerId,
      status: status || sale.status,
      shippingCost: shippingCost !== undefined ? shippingCost : sale.shippingCost,
      totalAmount: totalAmount,
    }, { transaction: t });

    await t.commit();

    // 4. AMBIL DATA TERBARU UNTUK DIKIRIM KE FRONTEND
    const updatedSale = await Sale.findByPk(id, {
      include: [
        { model: SaleItem },
        // Pastikan model Customer sudah didefinisikan relasinya di index models
        // { model: Customer, attributes: ['id', 'name'] }, 
      ],
    });

    res.json({
      success: true,
      message: 'Penjualan berhasil diperbarui',
      data: updatedSale,
    });

  } catch (err) {
    if (t) await t.rollback();
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