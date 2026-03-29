const express = require('express');
const router = express.Router();
const { getAll, getById, create, update, cancel, hardDelete, confirmDelivery } = require('../controllers/SaleController');

router.get('/', getAll);
router.get('/:id', getById);
router.post('/', create);
router.put('/:id', update);              
router.patch('/:id/cancel', cancel);     
router.delete('/:id', hardDelete);
router.post('/:id/confirm-delivery', confirmDelivery);

module.exports = router;