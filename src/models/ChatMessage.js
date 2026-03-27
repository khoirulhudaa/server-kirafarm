// models/ChatMessage.js
module.exports = (sequelize, DataTypes) => {
  const ChatMessage = sequelize.define('ChatMessage', {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    orderId: {
      type: DataTypes.STRING,
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
  }, { timestamps: true });

  ChatMessage.associate = (models) => {
    ChatMessage.belongsTo(models.Sale, {
      foreignKey: 'orderId',
      as: 'order'
    });
  };

  return ChatMessage;
};