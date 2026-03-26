const { Xendit } = require('xendit-node'); // Perhatikan kurung kurawal { }
const { Sale, SaleItem, Product } = require('../models');
const { v4: uuidv4 } = require('uuid');

// Inisialisasi SDK Xendit (Versi 3.x.x)
const xenditClient = new Xendit({
  secretKey: process.env.XENDIT_SECRET_KEY,
});

const XenditController = {
 createOrder: async (req, res) => {
    const t = await Sale.sequelize.transaction();
    try {
    const { 
        customerName, customerPhone, customerEmail, // Terima email di sini
        shippingAddress, items, type, pickupDate, holdingCost 
    } = req.body

      const saleId = uuidv4();
      let totalAmount = 0;
      const saleItemsData = [];

      for (const item of items) {
        const product = await Product.findByPk(item.productId);
        if (!product) throw new Error(`Produk ID ${item.productId} tidak ditemukan`);

        const subtotal = parseFloat(product.price) * item.quantity;
        totalAmount += subtotal;

        saleItemsData.push({
          id: uuidv4(),
          saleId: saleId,
          productId: product.id,
          productName: product.name,
          price: product.price,
          quantity: item.quantity,
          subtotal: subtotal
        });
      }

      totalAmount += parseFloat(holdingCost || 0);

      const newSale = await Sale.create({
        id: saleId,
        invoiceNumber: `INV-${Date.now()}`,
        customerName,
        customerPhone,
        shippingAddress,
        totalAmount,
        status: 'PENDING_PAYMENT',
        type: type || 'DIRECT',
        pickupDate: pickupDate || null,
        holdingCost: holdingCost || 0
      }, { transaction: t });

      await SaleItem.bulkCreate(saleItemsData, { transaction: t });

      // 2. Panggil Invoice LANGSUNG dari xenditClient
      // Tidak pakai 'new Invoice()', tapi langsung akses properti 'Invoice'
      const xenditInvoice = await xenditClient.Invoice.createInvoice({
        data: {
          externalId: saleId,
          amount: totalAmount,
          description: `Pembayaran Pesanan Kirafarm - ${newSale.invoiceNumber}`,
          customer: {
            givenNames: customerName,
            mobileNumber: customerPhone,
            email: customerEmail,
          },
          successRedirectUrl: `http://localhost:2388/history`,
          failureRedirectUrl: `http://localhost:2388/checkout`,
          currency: 'IDR',
        }
      });

      await t.commit();

      res.json({
        success: true,
        paymentUrl: xenditInvoice.invoiceUrl,
        orderId: saleId
      });
      
    } catch (error) {
      if (t) await t.rollback();
      console.error("Xendit Error Detail:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  handleWebhook: async (req, res) => {
    const { external_id, status } = req.body;

    try {
      if (status === 'PAID' || status === 'SETTLED') {
        await Sale.update(
          { status: 'PAID' },
          { where: { id: external_id } }
        );
        console.log(`✅ Order ${external_id} Berhasil Dibayar`);
      }
      res.status(200).send('Webhook Received');
    } catch (error) {
      console.error("Webhook Error:", error);
      res.status(500).send('Webhook Error');
    }
  },

  getOrderHistory: async (req, res) => {
    const { phone } = req.params;

    try {
      const orders = await Sale.findAll({
        where: { customerPhone: phone },
        include: [{
          model: SaleItem,
          as: 'SaleItems' // Secara default Sequelize pakai NamaModel+'s' jika tidak di-alias
        }],
        order: [['createdAt', 'DESC']]
      });

      if (!orders || orders.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Tidak ada riwayat pesanan untuk nomor ini.' 
        });
      }

      res.json({ success: true, data: orders });
    } catch (err) {
      console.error("History Error:", err);
      res.status(500).json({ success: false, message: "Gagal mengambil riwayat pesanan." });
    }
  }
};

module.exports = XenditController;