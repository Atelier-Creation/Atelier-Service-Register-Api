const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    id: { type: String, unique: true }, // Keeping string ID to match frontend logic if needed, but MongoDB _id is better. will store generated ID here too.
    name: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        required: true,
        unique: true,
    },
    totalJobs: {
        type: Number,
        default: 0,
    },
}, {
    timestamps: true,
});

const Customer = mongoose.model('Customer', customerSchema);

module.exports = Customer;
