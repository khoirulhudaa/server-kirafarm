const express = require('express');
const router = express.Router();
const { createOpname, getAllOpnames } = require('../controllers/stockOpnameController');
const AuthMiddleware = require('../middlewares/AuthMiddleware');

router.use(AuthMiddleware(['OWNER', 'ADMIN', 'SELLER']));

router.get('/', getAllOpnames);
router.post('/', createOpname);

module.exports = router;