const Customer = require('../models/Customer');
const whatsappService = require('../services/whatsappService');

// @desc    Send bulk marketing messages
// @route   POST /api/marketing/send
// @access  Private (Admin)
const sendMarketingMessages = async (req, res) => {
    try {
        const { message, audience } = req.body;

        if (!message) {
            return res.status(400).json({ message: 'Message content is required' });
        }

        let phones = [];

        // Determine audience
        if (audience === 'all') {
            // Get all customers with phones
            const customers = await Customer.find({ phone: { $exists: true, $ne: '' } });
            phones = customers.map(c => c.phone);
        } else if (Array.isArray(audience)) {
            // Specific list of phones
            phones = audience;
        } else {
            // Default to all for now or handle other criteria
            const customers = await Customer.find({ phone: { $exists: true, $ne: '' } });
            phones = customers.map(c => c.phone);
        }

        // Remove duplicates
        phones = [...new Set(phones)];

        if (phones.length === 0) {
            return res.status(400).json({ message: 'No recipients found' });
        }

        // Send messages
        const result = await whatsappService.sendMarketingMessage(phones, message);

        res.json(result);

    } catch (error) {
        console.error('Marketing error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    sendMarketingMessages
};
