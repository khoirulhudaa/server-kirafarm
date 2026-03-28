const express = require('express');
const router = express.Router();
const multer = require('multer');
const { 
  registerSeller, 
  getAllSellers, 
  updateSellerStatus 
} = require('../controllers/sellerController');
const AuthMiddleware = require('../middlewares/AuthMiddleware');

const storage = multer.memoryStorage();
const upload = multer({ storage });

// --- PUBLIC / BUYER ROUTES ---
router.post('/register', 
    AuthMiddleware(['BUYER', 'STAFF', 'ADMIN']),
    upload.fields([
        { name: 'ktp', maxCount: 1 },
        { name: 'selfieKtp', maxCount: 1 },
        { name: 'produk', maxCount: 1 }
    ]), 
    registerSeller
);

// --- ADMIN ONLY ROUTES ---
// Mengambil semua pendaftar seller
router.get('/', 
    AuthMiddleware(['ADMIN', 'OWNER']), 
    getAllSellers
);

// Approve atau Reject seller
router.patch('/status/:id', 
    AuthMiddleware(['ADMIN', 'OWNER']), 
    updateSellerStatus
);

module.exports = router;