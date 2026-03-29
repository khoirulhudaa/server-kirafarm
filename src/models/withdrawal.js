module.exports = (sequelize, DataTypes) => {
  const Withdrawal = sequelize.define('Withdrawal', {
    id: { type: DataTypes.STRING(36), primaryKey: true, allowNull: false },
    sellerId: { 
      type: DataTypes.STRING(36), 
      allowNull: false, // Tambahkan referensi eksplisit di sini juga membantu
      references: {
        model: 'Sellers',
        key: 'id'
      } 
    },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    
    // Snapshot rekening saat request dibuat (untuk keamanan jika seller ganti profil)
    bankName: { type: DataTypes.STRING, allowNull: false },
    
    accountNumber: { type: DataTypes.STRING, allowNull: false },
    accountName: { type: DataTypes.STRING, allowNull: false },
    
    status: { 
      type: DataTypes.ENUM('PENDING', 'SUCCESS', 'REJECTED'), 
      defaultValue: 'PENDING' 
    },
    adminNote: { type: DataTypes.TEXT }, // Catatan admin jika ditolak
    proofOfTransfer: { 
      type: DataTypes.STRING, 
      allowNull: true // Awalnya kosong, diisi saat admin proses transfer
    },
  }, { 
    timestamps: true, 
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci' 
  });

  Withdrawal.associate = (models) => {
    Withdrawal.belongsTo(models.Seller, { foreignKey: 'sellerId', as: 'seller' });
  };

  return Withdrawal;
};