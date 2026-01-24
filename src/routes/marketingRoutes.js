const express = require('express');
const router = express.Router();
const { sendMarketingMessages } = require('../controllers/marketingController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/send', protect, admin, sendMarketingMessages);

module.exports = router;
