module.exports = (sequelize, DataTypes) => {
  const SaleItem = sequelize.define('SaleItem', {
    id: { type: DataTypes.STRING(36), primaryKey: true, allowNull: false },
    saleId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    productId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    productName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    subtotal: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
  }, { 
    timestamps: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci' });
  
  SaleItem.associate = (models) => {
    SaleItem.belongsTo(models.Sale, { foreignKey: 'saleId' });
    SaleItem.belongsTo(models.Product, { foreignKey: 'productId' });
  };
  
  return SaleItem;
}