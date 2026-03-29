
const { Sale, Seller, sequelize } = require('../models');
const { Op } = require('sequelize');

const processSellerSettlement = async () => {
  const t = await sequelize.transaction();
  try {
    const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000);
    
    const readyToSettle = await Sale.findAll({
      where: {
        status: 'COMPLETED',
        isSettledToSeller: false,
        completedAt: { [Op.lte]: oneMinuteAgo }
      },
      transaction: t
    });

    for (const sale of readyToSettle) {
      if (!sale.sellerId) continue;

      // PERBAIKAN DI SINI: Sertakan Ongkir (Skenario B)
      const amountToSeller = parseFloat(sale.totalAmount) + parseFloat(sale.shippingCost || 0);

      // Gunakan increment agar saldo tidak tertimpa jika ada transaksi bersamaan
      await Seller.increment(
        { 
          balance: amountToSeller,        // Pastikan kolomnya 'saldo'
          totalEarnings: amountToSeller // Pastikan earnings juga bertambah di sini jika belum di controller
        }, 
        { where: { id: sale.sellerId }, transaction: t }
      );

      await sale.update({ 
        isSettledToSeller: true, 
        settledAt: new Date() 
      }, { transaction: t });
      
      console.log(`✅ [SETTLED] INV ${sale.invoiceNumber}: ${amountToSeller} (Produk + Ongkir) ke Seller`);
    }

    await t.commit();
  } catch (error) {
    if (t) await t.rollback();
    console.error("Settlement Error:", error);
  }
};

module.exports = { processSellerSettlement };