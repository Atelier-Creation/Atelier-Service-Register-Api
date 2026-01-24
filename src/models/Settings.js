const mongoose = require('mongoose');

const settingsSchema = mongoose.Schema({
    businessName: {
        type: String,
        default: 'Registra'
    },
    businessAddress: {
        type: String,
        default: ''
    },
    logo: {
        type: String, // Path to the uploaded file
        default: ''
    },
    whatsapp: {
        enabled: {
            type: Boolean,
            default: false
        },
        otpVerification: {
            type: Boolean,
            default: false
        },
        statusNotifications: {
            type: Boolean,
            default: false
        },
        accessToken: {
            type: String,
            default: ''
        },
        phoneNumberId: {
            type: String,
            default: ''
        },
        businessAccountId: {
            type: String,
            default: ''
        },
        webhookVerifyToken: {
            type: String,
            default: ''
        }
    }
}, {
    timestamps: true
});

// Ensure only one settings document exists
settingsSchema.statics.getSettings = async function () {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({});
    }
    return settings;
};

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = Settings;
