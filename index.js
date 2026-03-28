const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');
const dotenv = require('dotenv');
const errorHandler = require('./src/middlewares/ErroHandle');
const sequelize = require('./src/config/database');
require('dotenv').config(); // <--- WAJIB ADA DI BARIS PERTAMA
const { initSocket } = require('./socket');

// Di index.js, setelah app.use(express.urlencoded(...))
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./src/config/swagger');

// Import semua routes
const authRoutes = require('./src/routes/AuthRoute');
const productRoutes = require('./src/routes/ProductRoute');
const categoryRoutes = require('./src/routes/CategoryRoute');
const unitRoutes = require('./src/routes/UnitRoute');
const saleRoutes = require('./src/routes/SaleRoute');
const customerRoutes = require('./src/routes/CustomerRoute');
const userRoutes = require('./src/routes/UserRoute');
const xenditRoutes = require('./src/routes/xenditRoute');
const chatRoutes = require('./src/routes/chatRoute');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const io = initSocket(server); // ⬅️ tangkap return

app.set('io', io); // ⬅️ penting!

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // tambahan untuk form data

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/xendit', xenditRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/user', userRoutes);
app.use('/api/customers', customerRoutes);

// Route default / health check
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🌾 Selamat datang di KiraFarm Backend API!',
    version: '1.0.0',
    date: new Date().toISOString(),
    docs: '/api-docs', // nanti kalau pakai Swagger
  });
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 404 Handler - untuk route yang tidak ada
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} tidak ditemukan`,
  });
});

// Global Error Handler (harus di paling akhir)
app.use(errorHandler);

// Fungsi utama untuk start server
async function startServer() {
  try {
    // 1. Test koneksi database
    await sequelize.authenticate();
    console.log('✅ Koneksi ke database MySQL berhasil!');

    // 2. Sync model ke database (otomatis buat tabel jika belum ada)
    await sequelize.sync({ alter: false, force: false });
    // alter: true  → otomatis update struktur tabel jika ada perubahan model
    // force: false → tidak hapus data yang sudah ada
    console.log('✅ Sync model ke database selesai (tabel siap digunakan)');

    // 3. Jalankan server
    server.listen(PORT, () => {
      console.log(`🚀 AgroMart Backend berhasil berjalan!`);
      console.log(`📍 Server listening on http://localhost:${PORT}`);
      console.log(`🕒 Tanggal: ${new Date().toLocaleString('id-ID')}`);
    });
  } catch (error) {
    console.error('❌ Gagal memulai server:', error.message);
    console.error('Detail error:', error);

    // Keluar dari proses jika database gagal
    process.exit(1);
  }
}

// Jalankan server
startServer();

// Graceful shutdown (opsional, bagus untuk development)
process.on('SIGINT', async () => {
  console.log('\n🛑 Server sedang dimatikan...');
  await sequelize.close();
  console.log('✅ Koneksi database ditutup.');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Server di-terminate...');
  await sequelize.close();
  process.exit(0);
});