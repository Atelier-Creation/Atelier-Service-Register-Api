const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Job = require('./models/Job');
const Vendor = require('./models/Vendor');
const connectDB = require('./config/db');

dotenv.config();

const migrateVendors = async () => {
    try {
        await connectDB();

        console.log('Fetching all outsourced jobs...');
        const jobs = await Job.find({ 'outsourced.name': { $exists: true, $ne: '' } });

        console.log(`Found ${jobs.length} jobs with outsource data.`);

        let count = 0;
        for (const job of jobs) {
            const { name, phone } = job.outsourced;
            if (!name) continue;

            const existing = await Vendor.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });

            if (!existing) {
                await Vendor.create({
                    name: name,
                    phone: phone || ''
                });
                console.log(`Created vendor: ${name}`);
                count++;
            } else if (phone && !existing.phone) {
                // Update phone if missing
                existing.phone = phone;
                await existing.save();
                console.log(`Updated vendor phone: ${name}`);
            }
        }

        console.log(`Migration complete. Added ${count} new vendors.`);
        process.exit();
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrateVendors();
