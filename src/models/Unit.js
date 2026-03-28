module.exports = (sequelize, DataTypes) => {
  const Unit = sequelize.define('Unit', {
    id: { type: DataTypes.STRING(36), primaryKey: true, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    fullName: { type: DataTypes.STRING, allowNull: false },
    description: DataTypes.TEXT,
    status: { type: DataTypes.ENUM('ACTIVE', 'INACTIVE'), defaultValue: 'ACTIVE' },
    sellerId: {
      type: DataTypes.STRING(36),
      allowNull: true,
    }
  }, { 
    timestamps: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    indexes: [
      {
        unique: true,
        fields: ['name', 'sellerId'] // Unik hanya jika kombinasi nama DAN sellerId sama
      }
    ]
  });
  
  Unit.associate = (models) => {
    Unit.hasMany(models.Product, {
      foreignKey: 'unitId',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });
  };

  return Unit;
}