const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendorController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, vendorController.getVendors);
router.post('/', protect, vendorController.createVendor);

module.exports = router;
