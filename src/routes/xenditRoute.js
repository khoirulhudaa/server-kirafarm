const express = require('express');
const router = express.Router();
const XenditController = require('../controllers/XenditController');

router.post('/checkout-xendit', XenditController.createOrder);
router.post('/xendit-webhook', XenditController.handleWebhook);
router.get('/history/:phone', XenditController.getOrderHistory); 

module.exports = router;
