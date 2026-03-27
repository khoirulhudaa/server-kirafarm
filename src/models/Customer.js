module.exports = (sequelize, DataTypes) => {
  const Customer = sequelize.define('Customer', {
    id: {   type: DataTypes.STRING(36), primaryKey: true, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING, unique: true, allowNull: false },
    email: DataTypes.STRING,
    address: DataTypes.TEXT,
    notes: DataTypes.TEXT,
  }, { timestamps: true });

  return Customer;  
}