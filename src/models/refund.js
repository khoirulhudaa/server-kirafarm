module.exports = (sequelize, DataTypes) => {
  const Refund = sequelize.define('Refund', {
    id: { type: DataTypes.STRING(36), primaryKey: true },
    
    saleId: {
      type: DataTypes.STRING(36),
      allowNull: false
    },

    type: {
      type: DataTypes.ENUM('FULL', 'PARTIAL'),
      allowNull: false
    },

    amount: {
      type: DataTypes.DECIMAL(15,2),
      allowNull: false
    },

    reason: {
      type: DataTypes.TEXT,
      allowNull: false
    },

    proofUrl: {
      type: DataTypes.TEXT
    },

    account: {
      type: DataTypes.STRING
    },

    status: {
      type: DataTypes.ENUM(
        'REQUESTED',
        'REVIEW',
        'APPROVED',
        'REJECTED',
        'SUCCESS'
      ),
      defaultValue: 'REQUESTED'
    },

    adminNote: {
      type: DataTypes.TEXT
    }

  }, {
    timestamps: true
  });

  Refund.associate = (models) => {
    Refund.belongsTo(models.Sale, {
      foreignKey: 'saleId',
      as: 'sale'
    });
  };

  return Refund;
};