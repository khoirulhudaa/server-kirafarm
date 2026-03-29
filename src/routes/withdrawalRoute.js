const express = require('express');
const router = express.Router();
const { 
  requestWithdrawal, 
  getAllWithdrawals, 
  updateWithdrawalStatus 
} = require('../controllers/withdrawalController');
const AuthMiddleware = require('../middlewares/AuthMiddleware');

// Seller melakukan request
router.post('/request', AuthMiddleware(['SELLER']), requestWithdrawal);

// Admin mengelola request
router.get('/admin/all', AuthMiddleware(['ADMIN', 'OWNER','SELLER']), getAllWithdrawals);
router.patch('/admin/status/:id', AuthMiddleware(['ADMIN', 'OWNER', 'SELLER']), updateWithdrawalStatus);

module.exports = router;