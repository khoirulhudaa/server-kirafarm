module.exports = (sequelize, DataTypes) => {
  const Unit = sequelize.define('Unit', {
    id: { type: DataTypes.STRING(36), primaryKey: true, allowNull: false },
    name: { type: DataTypes.STRING, unique: true, allowNull: false },
    fullName: { type: DataTypes.STRING, allowNull: false },
    description: DataTypes.TEXT,
    status: { type: DataTypes.ENUM('ACTIVE', 'INACTIVE'), defaultValue: 'ACTIVE' },
  }, { 
    timestamps: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci' });
  
  Unit.associate = (models) => {
    Unit.hasMany(models.Product, {
      foreignKey: 'unitId',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });
  };

  return Unit;
}