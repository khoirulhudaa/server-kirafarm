module.exports = (sequelize, DataTypes) => {
  const Product = sequelize.define('Product', {
    id: { type: DataTypes.STRING, primaryKey: true, allowNull: false },
    code: { type: DataTypes.STRING, unique: true, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    stock: { type: DataTypes.INTEGER, defaultValue: 0 },
    description: DataTypes.TEXT,
    thumbnail: DataTypes.STRING,
    origin: DataTypes.STRING,
    status: { type: DataTypes.ENUM('ACTIVE', 'INACTIVE'), defaultValue: 'ACTIVE' },
    // HAPUS categoryId dan unitId dari sini!
  }, { 
    timestamps: true, 
    indexes: [
      // Index single column
      { fields: ['categoryId'] },
      { fields: ['status'] },
      { fields: ['code'] }, // sudah unique, tapi eksplisit lebih baik
  
      // Index untuk pencarian nama (partial search)
      { fields: ['name'] },
    ]
  });
  
  // Tambahkan associate
  Product.associate = (models) => {
    Product.belongsTo(models.Category, {
      foreignKey: 'categoryId',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });
    Product.belongsTo(models.Unit, {
      foreignKey: 'unitId',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });
    Product.hasMany(models.SaleItem, {
      foreignKey: 'productId',
      onDelete: 'CASCADE',
    });
  };

  return Product;
}