const express = require('express');
const {
  create,
  updateProfile,
  updatePassword,
  softDelete,
  getAll,
  getById,
} = require('../controllers/UserController');
const AuthMiddleware = require('../middlewares/AuthMiddleware');

const router = express.Router();

// Hanya OWNER & ADMIN yang bisa lihat semua user
router.get('/', AuthMiddleware(['OWNER', 'ADMIN']), getAll);
router.get('/:id', AuthMiddleware(['OWNER', 'ADMIN']), getById);

// Hanya OWNER & ADMIN yang bisa buat user baru
router.post('/', AuthMiddleware(['OWNER', 'ADMIN']), create);

// Update profile (user bisa update dirinya sendiri, atau ADMIN/OWNER update orang lain)
router.put('/:id/profile', AuthMiddleware(['OWNER', 'ADMIN']), updateProfile);

// Update password (user update sendiri atau ADMIN/OWNER)
router.patch('/:id/password', AuthMiddleware(['OWNER', 'ADMIN']), updatePassword);

// Soft delete / activate (hanya OWNER & ADMIN)
router.patch('/:id/status', AuthMiddleware(['OWNER', 'ADMIN']), softDelete);

module.exports = router;