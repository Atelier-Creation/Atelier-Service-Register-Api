const Settings = require('../models/Settings');
const fs = require('fs');
const path = require('path');

// @desc    Get global settings
// @route   GET /api/settings
// @access  Public (or Private? Public needed for Logo/Name on Login page if we wanted, but mostly Private) - let's make it Public for reading basic info like name/logo? Or just Private. Layout needs it. Layout is usually protected.
const getSettings = async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            settings = await Settings.create({
                businessName: 'Registra',
                businessAddress: '',
                logo: ''
            });
        }
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update settings
// @route   PUT /api/settings
// @access  Private (Admin)
const updateSettings = async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            settings = new Settings();
        }

        const { businessName, businessAddress } = req.body;

        if (businessName) settings.businessName = businessName;
        if (businessAddress) settings.businessAddress = businessAddress;

        if (req.file) {
            // Delete old logo if exists
            if (settings.logo) {
                const oldLogoPath = path.join(__dirname, '../../', settings.logo);
                if (fs.existsSync(oldLogoPath)) {
                    fs.unlinkSync(oldLogoPath);
                }
            }
            settings.logo = req.file.path.replace(/\\/g, '/'); // Normalize path
        }

        const updatedSettings = await settings.save();
        res.json(updatedSettings);

    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

module.exports = { getSettings, updateSettings };
