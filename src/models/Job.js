const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
    // We can use a custom ID field to match the frontend 'JOB'+Timestamp logic, 
    // or just rely on _id. The frontend uses `id` primarily.
    // I'll add a custom `jobId` field to preserve that readable format if they want, 
    // but typically `_id` is fine. The frontend code generates `JOB...` IDs. 
    // I'll make the backend generate similar IDs if not provided, or accept them.
    jobId: {
        type: String,
        unique: true
    },
    customerName: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ['walk-in', 'home-service'],
        default: 'walk-in'
    },
    address: {
        type: String, // Required for home-service
    },
    visitDate: {
        type: Date, // Scheduled visit date for home-service
    },
    deviceType: {
        type: String,
        required: true,
    },
    brand: {
        type: String,
    },
    model: {
        type: String,
        required: true,
    },
    device: {
        type: String, // Full device string
    },
    issue: {
        type: String,
        required: true,
    },
    receivedDate: {
        type: Date,
        default: Date.now,
    },
    estimatedDelivery: {
        type: Date,
    },
    technician: {
        type: String,
    },
    advanceAmount: {
        type: Number,
        default: 0,
    },
    totalAmount: {
        type: Number,
        default: 0,
    },
    status: {
        type: String,
        enum: ['received', 'in-progress', 'waiting', 'ready', 'delivered', 'outsourced', 'cancelled', 'returned'],
        default: 'received',
    },
    outsourced: {
        name: String,
        phone: String,
        cost: Number,
        date: Date,
    },
    statusHistory: [{
        status: String,
        timestamp: {
            type: Date,
            default: Date.now
        },
        note: String
    }],
    images: {
        before: [String],
        after: [String]
    },
    warranty: {
        type: String, // e.g., "3 Months", "No Warranty"
        default: ""
    },
    isWarranty: {
        type: Boolean,
        default: false
    },
    paymentBreakdown: [{
        description: String,
        amount: Number
    }],
}, {
    timestamps: true,
});

const Job = mongoose.model('Job', jobSchema);

module.exports = Job;
