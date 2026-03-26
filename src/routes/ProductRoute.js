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
const multer = require('multer');

// Konfigurasi Multer untuk simpan di RAM (Memory)
const storage = multer.memoryStorage();
const upload = multer({ storage });

const router = express.Router();

// Public: semua bisa baca
router.get('/', getAll);
router.get('/:id', getById);
// Protected: hanya OWNER/ADMIN yang bisa ubah data
router.post('/', AuthMiddleware(['OWNER', 'ADMIN']), upload.single('thumbnail'), create);
router.put('/:id', AuthMiddleware(['OWNER', 'ADMIN']), upload.single('thumbnail'), update);
router.patch('/:id/deactivate', AuthMiddleware(['OWNER', 'ADMIN']), softDelete); // soft delete
router.delete('/:id', AuthMiddleware(['OWNER', 'ADMIN']), hardDelete); // hard delete (hati-hati!)

module.exports = router;