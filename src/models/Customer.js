module.exports = (sequelize, DataTypes) => {
  const Customer = sequelize.define('Customer', {
    id: { type: DataTypes.STRING(36), primaryKey: true, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING, unique: true, allowNull: false },
    email: DataTypes.STRING,
    address: DataTypes.TEXT,
    notes: DataTypes.TEXT,
  }, { 
    timestamps: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci' // WAJIB SAMA DI SEMUA MODEL
  });
  return Customer;  
}