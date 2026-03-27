module.exports = (sequelize, DataTypes) => {
  const ChatMessage = sequelize.define('ChatMessage', {
    id: {
      type: DataTypes.STRING(36), // Disarankan tentukan panjangnya
      primaryKey: true,
    },
    orderId: {
      type: DataTypes.STRING(36), // Harus sama persis dengan Sales.id
      allowNull: false,
    },
    sender: {
      type: DataTypes.ENUM('BUYER', 'SELLER'),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    attachment: {
      type: DataTypes.TEXT,
      allowNull: true,
    }
  }, { 
    timestamps: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
  });

  ChatMessage.associate = (models) => {
    ChatMessage.belongsTo(models.Sale, {
      foreignKey: 'orderId',
      as: 'order',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  };

  return ChatMessage;
};