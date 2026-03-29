module.exports = (sequelize, DataTypes) => {
  const StockOpname = sequelize.define('StockOpname', {
    id: { type: DataTypes.STRING(36), primaryKey: true, allowNull: false },
    date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    previousStock: { type: DataTypes.INTEGER, allowNull: false },
    actualStock: { type: DataTypes.INTEGER, allowNull: false },
    difference: { type: DataTypes.INTEGER, allowNull: false },
    adjustmentType: { type: DataTypes.ENUM('PLUS', 'MINUS'), allowNull: false },
    note: { type: DataTypes.TEXT },
    userName: { type: DataTypes.STRING }, // Nama personil yang input
    productId: { 
      type: DataTypes.STRING(36), 
      allowNull: false 
    },
    sellerId: { 
      type: DataTypes.STRING(36), 
      allowNull: false 
    }
  }, { 
    timestamps: true, 
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci' 
  });

  StockOpname.associate = (models) => {
    StockOpname.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });
    StockOpname.belongsTo(models.Seller, { foreignKey: 'sellerId', as: 'seller' });
  };

  return StockOpname;
};