const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

router.get('/:orderId', chatController.getMessages);
router.post('/', chatController.sendMessage);
router.delete('/:id', chatController.deleteMessage);
router.put('/:id', chatController.editMessage);

module.exports = router;