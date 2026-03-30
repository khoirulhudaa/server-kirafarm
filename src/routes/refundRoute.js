const express = require('express');
const router = express.Router();
const {
  createRefund,
  getRefunds,
  approveRefund,
  rejectRefund
} = require('../controllers/refundController');

router.post('/', createRefund);
router.get('/', getRefunds);
router.post('/:id/approve', approveRefund);
router.post('/:id/reject', rejectRefund);

module.exports = router;