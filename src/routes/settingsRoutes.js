const express = require('express');
const router = express.Router();
const { getSettings, updateSettings, updateWhatsAppSettings } = require('../controllers/settingsController');
const { protect, admin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.route('/').get(protect, getSettings).put(protect, admin, upload.single('logo'), updateSettings);

router.put('/whatsapp', protect, admin, updateWhatsAppSettings);

// Public route to get settings (useful for login page or public context if needed, but for now protect is fine if whole app is behind login)
// Actually, layout loads after login, so protect is fine.

module.exports = router;
