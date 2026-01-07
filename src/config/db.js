const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = async () => {
    try {
        let connStr = process.env.NODE_ENV === 'test'
            ? process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/digital-service-register-test'
            : process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/digital-service-register';

        // Ensure we use 127.0.0.1 if localhost is failing
        if (connStr.includes('localhost')) {
            connStr = connStr.replace('localhost', '127.0.0.1');
        }

        const conn = await mongoose.connect(connStr);

        if (process.env.NODE_ENV !== 'test') {
            console.log(`MongoDB Connected: ${conn.connection.host}`);
        }
    } catch (error) {
        console.error(`MongoDB Connection Error: ${error.message}`);
        if (process.env.NODE_ENV !== 'test') {
            process.exit(1);
        } else {
            throw error;
        }
    }
};

module.exports = connectDB;
