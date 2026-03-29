const { Withdrawal, Seller, sequelize } = require('../models');
const { randomUUID } = require('crypto');

// 1. SELLER: Request Tarik Dana
const requestWithdrawal = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { amount } = req.body;
    const userId = req.user.id;

    const seller = await Seller.findOne({ where: { userId } });
    if (!seller) return res.status(404).json({ success: false, message: 'Seller tidak ditemukan' });

    // Validasi Saldo
    if (parseFloat(seller.balance) < parseFloat(amount)) {
      return res.status(400).json({ success: false, message: 'Saldo tidak mencukupi' });
    }
    if (amount < 10000) {
      return res.status(400).json({ success: false, message: 'Minimal penarikan Rp 10.000' });
    }

    // A. Kurangi balance seller dulu (Dana Ditahan)
    seller.balance = parseFloat(seller.balance) - parseFloat(amount);
    await seller.save({ transaction: t });

    // B. Buat record withdrawal
    const withdrawal = await Withdrawal.create({
      id: randomUUID(),
      sellerId: seller.id,
      amount,
      bankName: seller.bank,
      accountNumber: seller.rekening,
      accountName: seller.namaRekening,
      status: 'PENDING'
    }, { transaction: t });

    await t.commit();
    res.status(201).json({ success: true, message: 'Permintaan penarikan berhasil dikirim', data: withdrawal });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ success: false, message: err.message });
  }
};

// 2. ADMIN: Ambil Semua Request
const getAllWithdrawals = async (req, res) => {
  try {
    const data = await Withdrawal.findAll({
      include: [{ model: Seller, as: 'seller', attributes: ['namaToko'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 3. ADMIN: Approve/Reject (Konfirmasi Transfer Manual)
const updateWithdrawalStatus = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { status, adminNote } = req.body; // SUCCESS atau REJECTED

    const withdrawal = await Withdrawal.findByPk(id);
    if (!withdrawal) return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
    if (withdrawal.status !== 'PENDING') return res.status(400).json({ success: false, message: 'Request sudah diproses' });

    if (status === 'REJECTED') {
      // Jika ditolak, kembalikan saldo ke seller
      const seller = await Seller.findByPk(withdrawal.sellerId);
      seller.balance = parseFloat(seller.balance) + parseFloat(withdrawal.amount);
      await seller.save({ transaction: t });
    }

    withdrawal.status = status;
    withdrawal.adminNote = adminNote;
    await withdrawal.save({ transaction: t });

    await t.commit();
    res.json({ success: true, message: `Penarikan dana ${status.toLowerCase()}` });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { requestWithdrawal, getAllWithdrawals, updateWithdrawalStatus };