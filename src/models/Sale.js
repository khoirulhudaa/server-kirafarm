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
      status: {
        type: DataTypes.ENUM('PAID', 'PENDING', 'CANCELLED'),
        defaultValue: 'PAID',
      },
    }, { timestamps: true });
    
    Sale.associate = (models) => {
      Sale.belongsTo(models.Customer, { foreignKey: 'customerId', as: 'customer' });
      Sale.hasMany(models.SaleItem, { foreignKey: 'saleId', onDelete: 'CASCADE' });
    };

    return Sale;
}