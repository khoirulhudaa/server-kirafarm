module.exports = (sequelize, DataTypes) => {
  const Product = sequelize.define('Product', {
    id: { type: DataTypes.STRING(36), primaryKey: true, allowNull: false },
    code: { type: DataTypes.STRING, unique: true, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    stock: { type: DataTypes.INTEGER, defaultValue: 0 },
    description: DataTypes.TEXT,
    thumbnail: {
      type: DataTypes.TEXT, // Menggunakan TEXT agar aman untuk URL Cloudinary yang panjang
      allowNull: true
    },
    origin: DataTypes.STRING,
    status: { type: DataTypes.ENUM('ACTIVE', 'INACTIVE'), defaultValue: 'ACTIVE' },
    sellerId: {
      type: DataTypes.STRING(36),
      allowNull: true, // Wajib ada pemiliknya
    },
    categoryId: { type: DataTypes.STRING(36), allowNull: true },
    unitId: { type: DataTypes.STRING(36), allowNull: true },
    // HAPUS categoryId dan unitId dari sini!
  }, { 
    timestamps: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    indexes: [
      // Index single column
      { fields: ['categoryId'] },
      { fields: ['status'] },
      { fields: ['code'] }, // sudah unique, tapi eksplisit lebih baik
  
      // Index untuk pencarian nama (partial search)
      { fields: ['name'] },
      { fields: ['sellerId'] }
    ]
  });
  
// Gabungkan semua associate ke dalam SATU fungsi saja
  Product.associate = (models) => {
    // 1. Relasi ke Seller (Tambahkan alias 'seller' jika ingin dipanggil di include)
    Product.belongsTo(models.Seller, { 
      foreignKey: 'sellerId', 
      as: 'seller' 
    });

    // 2. Relasi ke Category
    Product.belongsTo(models.Category, {
      foreignKey: 'categoryId',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });

    // 3. Relasi ke Unit
    Product.belongsTo(models.Unit, {
      foreignKey: 'unitId',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });

    // 4. Relasi ke SaleItem
    Product.hasMany(models.SaleItem, {
      foreignKey: 'productId',
      onDelete: 'CASCADE',
      as: 'saleItems' 
    });
  };

  return Product;
};