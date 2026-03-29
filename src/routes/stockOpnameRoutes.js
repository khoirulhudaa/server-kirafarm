const express = require('express');
const router = express.Router();
const { createOpname, getAllOpnames } = require('../controllers/stockOpnameController');
const AuthMiddleware = require('../middlewares/AuthMiddleware');

router.get('/', AuthMiddleware(['OWNER', 'ADMIN', 'SELLER']), getAllOpnames);
router.post('/', AuthMiddleware(['OWNER', 'ADMIN', 'SELLER']), createOpname);

module.exports = router;