const express = require('express');
const router = express.Router();
const multer = require('multer');
const { registerSeller } = require('../controllers/sellerController');

// Gunakan Memory Storage agar tidak menyampah di server VPS
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Route POST: Tanpa AuthMiddleware jika pendaftaran ini untuk umum (calon seller baru)
router.post('/register', 
    AuthMiddleware(['BUYER', 'STAFF', 'ADMIN']),
    upload.fields([
    { name: 'ktp', maxCount: 1 },
    { name: 'selfieKtp', maxCount: 1 },
    { name: 'produk', maxCount: 1 }
]), registerSeller);

module.exports = router;