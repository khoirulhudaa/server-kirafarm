const { Sale, Seller, sequelize } = require('../models');
const { Op } = require('sequelize');

const processSellerSettlement = async () => {
  const t = await sequelize.transaction();
  try {
    // 1. Cari Sale yang COMPLETED > 2 jam yang lalu & belum settled
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    
    const readyToSettle = await Sale.findAll({
      where: {
        status: 'COMPLETED',
        isSettledToSeller: false,
        completedAt: { [Op.lte]: twoHoursAgo }
      },
      transaction: t
    });

    for (const sale of readyToSettle) {
      if (!sale.sellerId) continue;

      // 2. Update Saldo Seller
      // Nilai yang masuk ke seller adalah totalAmount (produk) 
      // Catatan: shippingCost biasanya masuk ke seller juga jika mereka yang kirim
      const amountToSeller = parseFloat(sale.totalAmount);

      await Seller.increment(
        { balance: amountToSeller, totalEarnings: amountToSeller },
        { where: { id: sale.sellerId }, transaction: t }
      );

      // 3. Tandai Sale sudah selesai
      await sale.update({ 
        isSettledToSeller: true, 
        settledAt: new Date() 
      }, { transaction: t });
      
      console.log(`✅ Settle INV ${sale.invoiceNumber} sebesar ${amountToSeller} ke Seller ${sale.sellerId}`);
    }

    await t.commit();
  } catch (error) {
    await t.rollback();
    console.error("Settlement Error:", error);
  }
};

module.exports = { processSellerSettlement };