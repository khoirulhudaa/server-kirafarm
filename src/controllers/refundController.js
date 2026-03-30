const { Refund, Sale, Seller } = require('../models');
const { randomUUID } = require('crypto');


// WEB CLIENT

exports.createRefund = async (req, res) => {
  try {
    const { orderId, type, reason, amount, account } = req.body;

    const sale = await Sale.findByPk(orderId);
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });
    }

    // ❗ VALIDASI RULE
    if (sale.status === 'SHIPPED') {
      return res.status(400).json({ success: false, message: 'Tidak bisa refund saat pengiriman' });
    }

    if (sale.status === 'COMPLETED') {
      const diffHours = (Date.now() - new Date(sale.completedAt)) / (1000 * 60 * 60);
      if (diffHours > 12) {
        return res.status(400).json({ success: false, message: 'Melewati batas waktu komplain' });
      }
    }

    const refund = await Refund.create({
      id: randomUUID(),
      saleId: orderId,
      type,
      amount: type === 'FULL'
        ? (parseFloat(sale.totalAmount) + parseFloat(sale.shippingCost))
        : parseFloat(amount),
      reason,
      account,
      proofUrl: req.file?.path || null
    });

    await sale.update({
      status: 'REFUND_REQUESTED'
    });

    res.json({ success: true, data: refund });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};



// WEB ADMIN

exports.getRefunds = async (req, res) => {
  const refunds = await Refund.findAll({
    include: [{ model: Sale, as: 'sale' }],
    order: [['createdAt', 'DESC']]
  });

  res.json({ success: true, data: refunds });
};


// INTI LOGIC

exports.approveRefund = async (req, res) => {
  const t = await Refund.sequelize.transaction();

  try {
    const { id } = req.params;

    const refund = await Refund.findByPk(id, {
      include: [{ model: Sale, as: 'sale' }]
    });

    if (!refund) throw new Error('Refund tidak ditemukan');

    const sale = refund.sale;

    // 1. Jika dana sudah cair ke seller → tarik balik
    if (sale.isSettledToSeller) {
      const seller = await Seller.findByPk(sale.sellerId);

      await seller.decrement({
        balance: refund.amount,
        totalEarnings: refund.amount
      }, { transaction: t });
    }

    // 2. Update refund
    await refund.update({
      status: 'SUCCESS'
    }, { transaction: t });

    // 3. Update sale
    await sale.update({
      status: 'REFUND_SUCCESS'
    }, { transaction: t });

    await t.commit();

    res.json({ success: true, message: 'Refund berhasil' });

  } catch (err) {
    await t.rollback();
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.rejectRefund = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const refund = await Refund.findByPk(id, {
    include: [{ model: Sale, as: 'sale' }]
  });

  await refund.update({
    status: 'REJECTED',
    adminNote: reason
  });

  await refund.sale.update({
    status: 'REFUND_REJECTED'
  });

  res.json({ success: true });
};