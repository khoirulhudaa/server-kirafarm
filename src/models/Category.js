module.exports = (sequelize, DataTypes) => {
  const Category = sequelize.define('Category', {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: DataTypes.TEXT,
    status: {
      type: DataTypes.ENUM('ACTIVE', 'INACTIVE'),
      defaultValue: 'ACTIVE',
    },
    sellerId: {
      type: DataTypes.STRING(36),
      allowNull: true,
    }
  }, {
    timestamps: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    tableName: 'Categories',
    indexes: [
      {
        unique: true,
        fields: ['name', 'sellerId']
      }
    ]
  });

  Category.associate = (models) => {
    Category.hasMany(models.Product, {
      foreignKey: 'categoryId',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });
  };

  return Category;
};