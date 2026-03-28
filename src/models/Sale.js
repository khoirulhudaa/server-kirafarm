  // module.exports = (sequelize, DataTypes) => {
  //     const Sale = sequelize.define('Sale', {
  //       id: {
  //         type: DataTypes.STRING,
  //         primaryKey: true,
  //         allowNull: false,
  //       },
  //       invoiceNumber: {
  //         type: DataTypes.STRING,
  //         unique: true,
  //         allowNull: false,
  //       },
  //       date: {
  //         type: DataTypes.DATE,
  //         allowNull: false,
  //         defaultValue: DataTypes.NOW,
  //       },
  //       customerId: {
  //         type: DataTypes.STRING,
  //         allowNull: true, // opsional, bisa null jika tanpa pelanggan terdaftar
  //       },
  //       customerName: {
  //         type: DataTypes.STRING,
  //         allowNull: false, // nama pelanggan langsung (untuk transaksi cepat)
  //       },
  //       totalAmount: {
  //         type: DataTypes.DECIMAL(15, 2),
  //         allowNull: false,
  //       },
  //       shippingAddress: { 
  //         type: DataTypes.TEXT, 
  //         allowNull: false 
  //       }, 
  //       shippingCost: { 
  //         type: DataTypes.DECIMAL(15, 2), 
  //         defaultValue: 0 
  //       }, 
  //       status: {
  //         type: DataTypes.ENUM('RESERVED', 'PENDING_PAYMENT', 'PAID', 'SHIPPED', 'COMPLETED', 'CANCELLED'),
  //         defaultValue: 'RESERVED'
  //       },
  //       customerPhone: {
  //         type: DataTypes.STRING,
  //         allowNull: false,
  //       },
  //       type: {
  //         type: DataTypes.ENUM('DIRECT', 'BOOKING'),
  //         defaultValue: 'DIRECT'
  //       },
  //       pickupDate: {
  //         type: DataTypes.DATE,
  //         allowNull: true,
  //       },
  //       holdingCost: {
  //         type: DataTypes.DECIMAL(15, 2),
  //         defaultValue: 0
  //       },
  //     }, { timestamps: true });
      
  //     Sale.associate = (models) => {
  //       Sale.belongsTo(models.Customer, { foreignKey: 'customerId', as: 'customer' });
  //       Sale.hasMany(models.SaleItem, { foreignKey: 'saleId', onDelete: 'CASCADE', as: 'items' });
  //     };

  //     return Sale;
  // }


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
    }, {
      timestamps: true,
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    });

    Sale.associate = (models) => {
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