const { randomUUID } = require('crypto');
const { Sale, SaleItem, Product, Customer } = require('../models');

// GET semua penjualan
const getAll = async (req, res) => {
  try {
    // Mengambil sellerId dari query params, misal: /sales?sellerId=123
    const { sellerId } = req.query; 
    
    // Buat objek filter kosong
    const whereCondition = {};
    
    // Jika ada sellerId di params, masukkan ke kondisi WHERE
    if (sellerId) {
      whereCondition.sellerId = sellerId;
    }

    const sales = await Sale.findAll({
      where: whereCondition, // Akan kosong jika tidak ada sellerId di URL
      include: [
        { 
          model: SaleItem, 
          as: 'items', 
          include: [{ model: Product }] 
        },
        { model: Customer }, // Opsional: sertakan data customer jika ada
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json({ success: true, data: sales });
  } catch (err) {
    console.error('Error fetching sales:', err);
    res.status(500).json({ success: false, message: err.message });
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

    const { customerName, customerId, items, shippingAddress, customerPhone, type, pickupDate, holdingCost } = req.body;

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
      customerPhone: customerPhone || '000000', // Pastikan ini terisi
      customerId: customerId || null,
      shippingAddress,
      totalAmount,
      shippingCost: 0,
      status: 'PENDING',
      type: type || 'DIRECT', // Tambahkan ini
      pickupDate: pickupDate || null, // Tambahkan ini
      holdingCost: holdingCost || 0 // Tambahkan ini
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
    const { 
      customerName, 
      customerId, 
      items, 
      status, 
      shippingCost,
      actualWeights 
    } = req.body;

    const sale = await Sale.findByPk(id, {
      include: [{ model: SaleItem, as: 'items' }]
    });
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Penjualan tidak ditemukan' });
    }

    if (sale.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Penjualan yang dibatalkan tidak bisa diubah' });
    }

    let totalAmount = sale.totalAmount;

    // =========================
    // UPDATE ITEMS (tetap sama)
    // =========================
    if (items && Array.isArray(items) && items.length > 0) {
      let newTotal = 0;
      const newSaleItems = [];

      for (const item of items) {
        const product = await Product.findByPk(item.productId);
        if (!product) {
          throw new Error(`Produk dengan ID ${item.productId} tidak ditemukan`);
        }

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

        if (status === 'SHIPPED' && sale.status !== 'SHIPPED') {
          if (product.stock < weight) {
            throw new Error(`Stok produk ${product.name} tidak mencukupi`);
          }
          await product.update({ stock: product.stock - weight }, { transaction: t });
        }
      }

      await SaleItem.destroy({ where: { saleId: sale.id }, transaction: t });
      await SaleItem.bulkCreate(newSaleItems, { transaction: t });
      totalAmount = newTotal;
    }

    // =========================
    // UPDATE SALE
    // =========================
    await sale.update({
      customerName: customerName || sale.customerName,
      customerId: customerId || sale.customerId,
      status: status || sale.status,
      shippingCost: shippingCost !== undefined ? shippingCost : sale.shippingCost,
      totalAmount: totalAmount,
    }, { transaction: t });

    await t.commit();

    // =========================
    // 🔥 SOCKET.IO EMIT DI SINI
    // =========================
    const io = req.app.get('io');

    io.to(id).emit("shipping_updated", {
      orderId: id,
      status: status || sale.status,
      shippingCost: shippingCost,
      message: "Pesanan kamu diupdate oleh seller"
    });

    // =========================
    // RESPONSE
    // =========================
    const updatedSale = await Sale.findByPk(id, {
      include: [{ model: SaleItem, as: 'items' }]
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