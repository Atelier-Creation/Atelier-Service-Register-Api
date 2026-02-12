const OTP = require('../models/OTP');
const whatsappService = require('../services/whatsappService');

// Generate 6-digit OTP
const generateOTP = () => {
    return '123456'; // Static OTP for dev/mock
};

// @desc    Send OTP to phone number
// @route   POST /api/otp/send
// @access  Public
const sendOTP = async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({ message: 'Phone number is required' });
        }

        // Check rate limiting: Max 3 OTPs per phone per hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentOTPs = await OTP.countDocuments({
            phone,
            createdAt: { $gte: oneHourAgo }
        });

        if (recentOTPs >= 3) {
            return res.status(429).json({
                message: 'Too many OTP requests. Please try again later.'
            });
        }

        // Delete any existing un verified OTPs for this phone
        await OTP.deleteMany({ phone, verified: false });

        // Generate OTP
        const otpCode = generateOTP();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        // Save OTP to database
        const otp = await OTP.create({
            phone,
            otp: otpCode,
            expiresAt
        });

        // Send OTP via WhatsApp
        const result = await whatsappService.sendOTP(phone, otpCode);

        if (!result.success) {
            // Delete OTP if sending failed
            await OTP.deleteOne({ _id: otp._id });
            return res.status(500).json({
                message: 'Failed to send OTP',
                error: result.error || result.message
            });
        }

        res.status(200).json({
            message: 'OTP sent successfully',
            expiresAt,
            messageId: result.messageId
        });
    } catch (error) {
        console.error('Send OTP error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify OTP
// @route   POST /api/otp/verify
// @access  Public
const verifyOTP = async (req, res) => {
    try {
        const { phone, otp } = req.body;

        if (!phone || !otp) {
            return res.status(400).json({ message: 'Phone and OTP are required' });
        }

        // Find OTP
        const otpRecord = await OTP.findOne({
            phone,
            otp,
            verified: false,
            expiresAt: { $gt: new Date() }
        });

        if (!otpRecord) {
            // Increment attempts
            await OTP.updateMany(
                { phone, verified: false },
                { $inc: { attempts: 1 } }
            );

            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        // Check max attempts
        if (otpRecord.attempts >= 3) {
            await OTP.deleteOne({ _id: otpRecord._id });
            return res.status(400).json({ message: 'Maximum verification attempts exceeded' });
        }

        // Mark as verified
        otpRecord.verified = true;
        await otpRecord.save();

        // Clean up old OTPs for this phone
        await OTP.deleteMany({
            phone,
            _id: { $ne: otpRecord._id }
        });

        res.status(200).json({
            message: 'OTP verified successfully',
            verified: true
        });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    sendOTP,
    verifyOTP
};
