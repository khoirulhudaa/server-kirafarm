const express = require('express');
const {
  getAll,
  getById,
  create,
  update,
  softDelete,
  hardDelete,
} = require('../controllers/productController');
const AuthMiddleware = require('../middlewares/AuthMiddleware');

const router = express.Router();

// Public: semua bisa baca
router.get('/', getAll);
router.get('/:id', getById);

// Protected: hanya OWNER/ADMIN yang bisa ubah data
router.post('/', AuthMiddleware(['OWNER', 'ADMIN']), create);
router.put('/:id', AuthMiddleware(['OWNER', 'ADMIN']), update);
router.patch('/:id/deactivate', AuthMiddleware(['OWNER', 'ADMIN']), softDelete); // soft delete
router.delete('/:id', AuthMiddleware(['OWNER', 'ADMIN']), hardDelete); // hard delete (hati-hati!)

module.exports = router;