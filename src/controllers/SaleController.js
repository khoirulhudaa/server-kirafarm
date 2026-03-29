const { randomUUID } = require('crypto');
const { Sale, SaleItem, Product, Customer, Seller } = require('../models');

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
        { model: Customer, as: 'customer' }, // Opsional: sertakan data customer jika ada
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json({ success: true, data: sales, message: 'Berhasil daaptkan data!' });
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
    const { 
      customerName, 
      customerId, 
      items, 
      shippingAddress, 
      customerPhone, 
      type, 
      pickupDate, 
      holdingCost 
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Keranjang kosong' });
    }

    const saleId = randomUUID();
    const saleItems = [];
    let totalAmount = 0;
    let finalSellerId = null; // Variable untuk menampung sellerId

    for (const item of items) {
      const product = await Product.findByPk(item.productId);
      
      if (!product) {
        throw new Error(`Produk dengan ID ${item.productId} tidak ditemukan.`);
      }

      // --- AMBIL SELLER ID DARI PRODUK ---
      // Kita asumsikan transaksi ini milik seller dari produk tersebut
      if (!finalSellerId) {
        finalSellerId = product.sellerId; 
      }

      const subtotal = parseFloat(product.price) * item.quantity;
      totalAmount += subtotal;

      saleItems.push({
        id: randomUUID(),
        saleId: saleId,
        productId: product.id,
        productName: product.name,
        price: product.price,
        quantity: item.quantity,
        subtotal
      });
    }

    // Buat data Sale dengan menyertakan sellerId
    const sale = await Sale.create({
      id: saleId,
      invoiceNumber: `INV-${Date.now()}`,
      sellerId: finalSellerId, // <--- SELLER ID DIMASUKKAN DI SINI
      customerName,
      customerPhone: customerPhone || '000000',
      customerId: customerId || null,
      shippingAddress,
      totalAmount,
      shippingCost: 0,
      status: 'PENDING',
      type: type || 'DIRECT',
      pickupDate: pickupDate || null,
      holdingCost: holdingCost || 0
    }, { transaction: t });

    await SaleItem.bulkCreate(saleItems, { transaction: t });
    
    await t.commit();
    res.status(201).json({ success: true, data: sale });
  } catch (err) {
    if (t) await t.rollback();
    res.status(500).json({ success: false, message: err.message });
  }
};

// const update = async (req, res) => {
//   const t = await Sale.sequelize.transaction();
//   try {
//     const { id } = req.params;
//     const { 
//       customerName, 
//       customerId, 
//       items, 
//       status, 
//       shippingCost,
//       actualWeights 
//     } = req.body;

//     const sale = await Sale.findByPk(id, {
//       include: [{ model: SaleItem, as: 'items' }]
//     });
//     if (!sale) {
//       return res.status(404).json({ success: false, message: 'Penjualan tidak ditemukan' });
//     }

//     if (sale.status === 'CANCELLED') {
//       return res.status(400).json({ success: false, message: 'Penjualan yang dibatalkan tidak bisa diubah' });
//     }

//     let totalAmount = sale.totalAmount;

//     if (items && Array.isArray(items) && items.length > 0) {
//       let newTotal = 0;
//       const newSaleItems = [];

//       for (const item of items) {
//         const product = await Product.findByPk(item.productId);
//         if (!product) {
//           throw new Error(`Produk dengan ID ${item.productId} tidak ditemukan`);
//         }

//         const weight = (actualWeights && actualWeights[item.productId]) 
//           ? actualWeights[item.productId] 
//           : item.quantity;

//         const subtotal = product.price * weight;
//         newTotal += subtotal;

//         newSaleItems.push({
//           id: randomUUID(),
//           saleId: sale.id,
//           productId: product.id,
//           productName: product.name,
//           price: product.price,
//           quantity: weight,
//           subtotal,
//         });

//         if (status === 'SHIPPED' && sale.status !== 'SHIPPED') {
//           if (product.stock < weight) {
//             throw new Error(`Stok produk ${product.name} tidak mencukupi`);
//           }
//           await product.update({ stock: product.stock - weight }, { transaction: t });
//         }
//       }

//       await SaleItem.destroy({ where: { saleId: sale.id }, transaction: t });
//       await SaleItem.bulkCreate(newSaleItems, { transaction: t });
//       totalAmount = newTotal;
//     }

//     const isBecomingCompleted = (status === 'COMPLETED' && sale.status !== 'COMPLETED');

//     // =========================
//     // UPDATE SALE
//     // =========================
//     await sale.update({
//       customerName: customerName || sale.customerName,
//       customerId: customerId || sale.customerId,
//       status: status || sale.status,
//       shippingCost: shippingCost !== undefined ? shippingCost : sale.shippingCost,
//       totalAmount: totalAmount,
//       ...(isBecomingCompleted && { completedAt: new Date() })
//     }, { transaction: t });

//     if (isBecomingCompleted && sale.sellerId) {
//       const seller = await Seller.findByPk(sale.sellerId);
//       if (seller) {
//         // Gunakan totalAmount terbaru (hasil hitung ulang di atas) + shippingCost terbaru
//         const finalShippingCost = shippingCost !== undefined ? shippingCost : sale.shippingCost;
//         const amountToAdd = parseFloat(totalAmount) + parseFloat(finalShippingCost || 0);
        
//         const newEarnings = parseFloat(seller.totalEarnings || 0) + amountToAdd;
        
//         await seller.update({
//           totalEarnings: newEarnings
//         }, { transaction: t });
//       }
//     }

//     await t.commit();

//     // =========================
//     // 🔥 SOCKET.IO EMIT DI SINI
//     // =========================
//     const io = req.app.get('io');

//     io.to(id).emit("shipping_updated", {
//       orderId: id,
//       status: status || sale.status,
//       shippingCost: shippingCost,
//       message: "Pesanan kamu diupdate oleh seller"
//     });

//     // =========================
//     // RESPONSE
//     // =========================
//     const updatedSale = await Sale.findByPk(id, {
//       include: [{ model: SaleItem, as: 'items' }]
//     });

//     res.json({
//       success: true,
//       message: 'Penjualan berhasil diperbarui',
//       data: updatedSale,
//     });

//   } catch (err) {
//     if (t) await t.rollback();
//     console.error('Error updating sale:', err);
//     res.status(500).json({
//       success: false,
//       message: err.message || 'Gagal memperbarui penjualan',
//     });
//   }
// };

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

    // 1. Ambil data lama sebelum diupdate untuk perbandingan
    const sale = await Sale.findByPk(id, {
      include: [{ model: SaleItem, as: 'items' }]
    });

    if (!sale) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Penjualan tidak ditemukan' });
    }

    if (sale.status === 'CANCELLED') {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Penjualan yang dibatalkan tidak bisa diubah' });
    }

    // Identifikasi perubahan status untuk Logika Saldo
    const isNowCompleted = (status === 'COMPLETED' && sale.status !== 'COMPLETED');
    const isRevertingFromCompleted = (sale.status === 'COMPLETED' && status && status !== 'COMPLETED');

    let currentTotalAmount = parseFloat(sale.totalAmount);

    // ==========================================
    // 2. UPDATE ITEMS & RE-CALCULATE TOTAL AMOUNT
    // ==========================================
    if (items && Array.isArray(items) && items.length > 0) {
      let newTotal = 0;
      const newSaleItems = [];

      for (const item of items) {
        const product = await Product.findByPk(item.productId);
        if (!product) throw new Error(`Produk dengan ID ${item.productId} tidak ditemukan`);

        // Tentukan quantity/berat (actualWeights dari input timbangan diprioritaskan)
        const weight = (actualWeights && actualWeights[item.productId]) 
          ? parseFloat(actualWeights[item.productId]) 
          : parseFloat(item.quantity);

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

        // Potong stok jika status berubah ke SHIPPED
        if (status === 'SHIPPED' && sale.status !== 'SHIPPED') {
          if (product.stock < weight) throw new Error(`Stok produk ${product.name} tidak mencukupi`);
          await product.update({ stock: product.stock - weight }, { transaction: t });
        }
      }

      // Hapus item lama, ganti dengan yang baru (Sync)
      await SaleItem.destroy({ where: { saleId: sale.id }, transaction: t });
      await SaleItem.bulkCreate(newSaleItems, { transaction: t });
      currentTotalAmount = newTotal;
    }

    // ==========================================
    // 3. LOGIKA SALDO SELLER (SKENARIO B)
    // ==========================================
    if (sale.sellerId && (isNowCompleted || isRevertingFromCompleted)) {
      const seller = await Seller.findByPk(sale.sellerId);
      if (seller) {
        let finalEarnings = parseFloat(seller.totalEarnings || 0);
        let finalSaldo = parseFloat(seller.saldo || 0);

        if (isNowCompleted) {
          // Tambah: Total Produk Baru + Ongkir Baru (atau lama jika tidak diupdate)
          const newShipping = shippingCost !== undefined ? parseFloat(shippingCost) : parseFloat(sale.shippingCost || 0);
          const amountToAdd = currentTotalAmount + newShipping;
          
          finalEarnings += amountToAdd;
          finalSaldo += amountToAdd;
        } 
        else if (isRevertingFromCompleted) {
          // Rollback: Kurangi berdasarkan nilai yang benar-benar tersimpan di DB sebelumnya
          const amountToSubtract = parseFloat(sale.totalAmount) + parseFloat(sale.shippingCost || 0);
          
          finalEarnings -= amountToSubtract;
          finalSaldo -= amountToSubtract;
        }

        await seller.update({ 
          totalEarnings: finalEarnings,
          saldo: finalSaldo 
        }, { transaction: t });
      }
    }

    // ==========================================
    // 4. UPDATE MASTER SALE
    // ==========================================
    await sale.update({
      customerName: customerName || sale.customerName,
      customerId: customerId || sale.customerId,
      status: status || sale.status,
      shippingCost: shippingCost !== undefined ? parseFloat(shippingCost) : sale.shippingCost,
      totalAmount: currentTotalAmount,
      completedAt: isNowCompleted ? new Date() : (isRevertingFromCompleted ? null : sale.completedAt)
    }, { transaction: t });

    await t.commit();

    // Notifikasi Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(id).emit("shipping_updated", {
        orderId: id,
        status: status || sale.status,
        message: "Data transaksi diperbarui"
      });
    }

    const updatedData = await Sale.findByPk(id, { include: [{ model: SaleItem, as: 'items' }] });
    res.json({ success: true, data: updatedData });

  } catch (err) {
    if (t) await t.rollback();
    res.status(500).json({ success: false, message: err.message });
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

const confirmDelivery = async (req, res) => {
  const t = await Sale.sequelize.transaction();
  try {
    const { id } = req.params;

    const sale = await Sale.findByPk(id);
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan' });
    }

    // Validasi: Hanya status SHIPPED (sudah dikirim) yang bisa diselesaikan
    if (sale.status !== 'SHIPPED') {
      return res.status(400).json({ 
        success: false, 
        message: 'Pesanan harus dikirim (SHIPPED) sebelum dikonfirmasi selesai.' 
      });
    }

    // 1. Update status transaksi
    await sale.update({
      status: 'COMPLETED',
      completedAt: new Date()
    }, { transaction: t });

    // 2. Distribusi Saldo ke Seller (Skenario B: Harga + Ongkir)
    if (sale.sellerId) {
      const seller = await Seller.findByPk(sale.sellerId);
      if (seller) {
        const amountToAdd = parseFloat(sale.totalAmount) + parseFloat(sale.shippingCost || 0);
        
        const newEarnings = parseFloat(seller.totalEarnings || 0) + amountToAdd;
        const newSaldo = parseFloat(seller.saldo || 0) + amountToAdd;
        
        await seller.update({
          totalEarnings: newEarnings,
          saldo: newSaldo
        }, { transaction: t });
      }
    }

    await t.commit();

    res.json({
      success: true,
      message: 'Transaksi selesai. Saldo dan Earnings seller telah diperbarui.',
      data: { status: 'COMPLETED' }
    });
  } catch (err) {
    if (t) await t.rollback();
    console.error('Confirm Delivery Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  cancel,      
  hardDelete,  
  confirmDelivery
};