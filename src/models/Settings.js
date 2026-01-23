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
    }
}, {
    timestamps: true
});

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = Settings;
