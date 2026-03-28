module.exports = (sequelize, DataTypes) => {
  const Seller = sequelize.define('Seller', {
    id: { type: DataTypes.STRING(36), primaryKey: true, allowNull: false },
    // Identitas
    nama: { type: DataTypes.STRING, allowNull: false },
    nik: { type: DataTypes.STRING(16), allowNull: false },
    fotoKtp: { type: DataTypes.TEXT },
    fotoNpwp: { type: DataTypes.TEXT }, // GANTI DI SINI (Sebelumnya fotoSelfieKtp)
    
    // Toko
    namaToko: { type: DataTypes.STRING, allowNull: false },
    slug: { type: DataTypes.STRING, unique: true, allowNull: false },
    alamat: { type: DataTypes.TEXT, allowNull: false },
    deskripsi: { type: DataTypes.TEXT },
    
    // Finansial
    bank: { type: DataTypes.STRING, allowNull: false },
    bankCode: { type: DataTypes.STRING, allowNull: false },
    rekening: { type: DataTypes.STRING, allowNull: false },
    namaRekening: { type: DataTypes.STRING, allowNull: false },
    
    // Kontak
    whatsapp: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    
    // Sampel Produk
    fotoProduk: { type: DataTypes.TEXT },
    
    status: { 
      type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'), 
      defaultValue: 'PENDING' 
    },
  }, { 
    timestamps: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci' 
  });

  Seller.associate = (models) => {
    // Tetap menggunakan alias 'account' agar sinkron dengan Controller
    Seller.belongsTo(models.User, { foreignKey: 'userId', as: 'account' });
  };

  return Seller;
};