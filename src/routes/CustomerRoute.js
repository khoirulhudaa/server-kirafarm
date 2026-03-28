const express = require('express');
const {
  getAll,
  getById,
  create,
  update,
  destroy,
} = require('../controllers/CustomerController');
const AuthMiddleware = require('../middlewares/AuthMiddleware');

const router = express.Router();

// Public (semua bisa lihat pelanggan)
router.get('/', getAll);
router.get('/:id', getById);

// Protected
router.post('/', AuthMiddleware(['OWNER', 'ADMIN', 'SELLER']), create); // SELLER boleh tambah pelanggan
router.put('/:id', AuthMiddleware(['OWNER', 'ADMIN', 'SELLER']), update);
router.patch('/:id/deactivate', AuthMiddleware(['OWNER', 'ADMIN', 'SELLER']), destroy);

module.exports = router;