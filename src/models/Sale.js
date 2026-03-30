  module.exports = (sequelize, DataTypes) => {
    const Sale = sequelize.define('Sale', {
      id: { type: DataTypes.STRING(36), primaryKey: true, allowNull: false },
      invoiceNumber: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
      },

      customerId: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      customerName: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      customerPhone: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      customerEmail: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      shippingAddress: {
        type: DataTypes.TEXT,
        allowNull: false,
      },

      totalAmount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
      },

      // ✅ Ongkir dari seller (awalnya 0, nanti diupdate seller)
      shippingCost: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0,
      },

      // ✅ Total akhir setelah ongkir
      grandTotal: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
      },

      // ✅ Status BARU (sesuai flow kamu)
      status: {
        type: DataTypes.ENUM(
          'PENDING',           // baru checkout
          'WAITING_PAYMENT',   // ongkir sudah diisi seller
          'PROCESSING',        // sudah dibayar
          'SHIPPED',
          'DELIVERED',
          'COMPLETED',
          'CANCELLED',
          'REFUND_REQUESTED',
          'REFUND_REVIEW',
          'REFUND_SUCCESS',
          'REFUND_REJECTED',
          'EXPIRED'
        ),
        defaultValue: 'PENDING',
      },

      // ✅ Booking / Direct
      type: {
        type: DataTypes.ENUM('DIRECT', 'BOOKING'),
        defaultValue: 'DIRECT',
      },

      pickupDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      holdingCost: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0,
      },

      // ✅ URL pembayaran (diisi setelah klik "Bayar Sekarang")
      paymentUrl: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      // ✅ Tracking waktu penting
      paidAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      shippedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      deliveredAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      completedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      sellerId: {
        type: DataTypes.STRING(36),
        allowNull: true,
      },

      isSettledToSeller: { 
        type: DataTypes.BOOLEAN, 
        defaultValue: false 
      },
      settledAt: { 
        type: DataTypes.DATE, 
        allowNull: true 
      },
    }, {
      timestamps: true,
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    });

    Sale.associate = (models) => {

      Sale.belongsTo(models.Seller, {
        foreignKey: 'sellerId',
        as: 'seller'
      });

      Sale.belongsTo(models.Customer, {
        foreignKey: 'customerId',
        as: 'customer'
      });

      Sale.hasMany(models.SaleItem, {
        foreignKey: 'saleId',
        onDelete: 'CASCADE',
        as: 'items'
      });
    };

    return Sale;
  };