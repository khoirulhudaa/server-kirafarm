const express = require('express');
const router = express.Router();
const multer = require('multer');
const { 
  requestWithdrawal, 
  getAllWithdrawals, 
  updateWithdrawalStatus 
} = require('../controllers/withdrawalController');
const AuthMiddleware = require('../middlewares/AuthMiddleware');

// Gunakan memoryStorage agar kompatibel dengan Cloudinary streamUpload
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Seller melakukan request
router.post('/request', AuthMiddleware(['SELLER']), requestWithdrawal);

// Admin mengelola request + Upload Bukti Transfer
router.patch('/admin/status/:id', 
  AuthMiddleware(['ADMIN', 'OWNER', 'SELLER']), 
  upload.single('proof'), // Nama field dari frontend: 'proof'
  updateWithdrawalStatus
);

router.get('/admin/all', AuthMiddleware(['ADMIN', 'OWNER', 'SELLER']), getAllWithdrawals);

module.exports = router;