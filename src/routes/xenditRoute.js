const express = require('express');
const router = express.Router();
const XenditController = require('../controllers/XenditController');

router.post('/checkout-xendit', XenditController.createOrder);
router.post('/xendit-webhook', XenditController.handleWebhook);
router.get('/order/:orderId', XenditController.getOrderById);
router.get('/history/:phone', XenditController.getOrderHistory); 
router.post('/pay', XenditController.payOrder);

module.exports = router;
