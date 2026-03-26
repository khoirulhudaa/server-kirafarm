const express = require('express');
const router = express.Router();
const { getAll, getById, create, update, cancel, hardDelete } = require('../controllers/SaleController');
const Sale = require('../models/Sale');

router.get('/', getAll);
router.get('/:id', getById);
router.post('/', create);
router.put('/:id', update);              
router.patch('/:id/cancel', cancel);     
router.delete('/:id', hardDelete);
router.get('/history/:phone', async (req, res) => {
  try {
    const orders = await Sale.findAll({
      where: { customerPhone: req.params.phone },
      include: [SaleItem],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;