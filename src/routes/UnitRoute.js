const express = require('express');
const {
  getAll,
  getById,
  create,
  update,
  softDelete,
} = require('../controllers/UnitController');
const AuthMiddleware = require('../middlewares/AuthMiddleware');

const router = express.Router();

// Public
router.get('/', getAll);
router.get('/:id', getById);

// Protected
router.post('/', AuthMiddleware(['OWNER', 'ADMIN', 'SELLER']), create);
router.put('/:id', AuthMiddleware(['OWNER', 'ADMIN', 'SELLER']), update);
router.patch('/:id/deactivate', AuthMiddleware(['OWNER', 'ADMIN', 'SELLER']), softDelete);

module.exports = router;