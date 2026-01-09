const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Job = require('../src/models/Job');
const Customer = require('../src/models/Customer');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = async () => {
    try {
        const connStr = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/digital-service-register';
        const conn = await mongoose.connect(connStr);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`MongoDB Connection Error: ${error.message}`);
        process.exit(1);
    }
};

const resetData = async () => {
    try {
        await connectDB();

        // Delete all jobs
        const deletedJobs = await Job.deleteMany({});
        console.log(`Deleted ${deletedJobs.deletedCount} jobs.`);

        // Delete all customers
        const deletedCustomers = await Customer.deleteMany({});
        console.log(`Deleted ${deletedCustomers.deletedCount} customers.`);

        console.log('Data reset complete. Next order ID will start from 101 (if configured).');

        process.exit(0);
    } catch (error) {
        console.error('Error resetting data:', error);
        process.exit(1);
    }
};

resetData();
