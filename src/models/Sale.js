module.exports = (sequelize, DataTypes) => {
    const Sale = sequelize.define('Sale', {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      invoiceNumber: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
      },
      date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      customerId: {
        type: DataTypes.STRING,
        allowNull: true, // opsional, bisa null jika tanpa pelanggan terdaftar
      },
      customerName: {
        type: DataTypes.STRING,
        allowNull: false, // nama pelanggan langsung (untuk transaksi cepat)
      },
      totalAmount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
      },
      shippingAddress: { 
        type: DataTypes.TEXT, 
        allowNull: false 
      }, 
      shippingCost: { 
        type: DataTypes.DECIMAL(15, 2), 
        defaultValue: 0 
      }, 
      status: {
        type: DataTypes.ENUM('RESERVED', 'PENDING_PAYMENT', 'PAID', 'SHIPPED', 'COMPLETED', 'CANCELLED'),
        defaultValue: 'RESERVED'
      },
      customerPhone: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM('DIRECT', 'BOOKING'),
        defaultValue: 'DIRECT'
      },
      pickupDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      holdingCost: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0
      },
    }, { timestamps: true });
    
    Sale.associate = (models) => {
      Sale.belongsTo(models.Customer, { foreignKey: 'customerId', as: 'customer' });
      Sale.hasMany(models.SaleItem, { foreignKey: 'saleId', onDelete: 'CASCADE', as: 'items' });
    };

    return Sale;
}