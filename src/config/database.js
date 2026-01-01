const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,        
    dialect: 'mysql',
    logging: false,                          
    timezone: '+07:00',                     
    dialectOptions: {
      // Tambahan untuk stabilitas koneksi di Windows/local
      connectTimeout: 60000,
      bigNumberStrings: true,
      decimalNumbers: true,
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      // otomatis createdAt & updatedAt
      timestamps: true,       
      // nama kolom camelCase (default)
      underscored: false,     
      // biar Sequelize pluralize otomatis (Categories, dll)
      freezeTableName: false, 
    },
  }
);

// Test koneksi saat file di-load (opsional - bagus untuk debug)
sequelize.authenticate()
  .then(() => console.log('✅ Sequelize: Koneksi database siap!'))
  .catch(err => console.error('❌ Sequelize: Gagal koneksi:', err.message));

module.exports = sequelize;