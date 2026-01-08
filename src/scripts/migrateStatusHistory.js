const mongoose = require('mongoose');
const Job = require('../models/Job');
const dotenv = require('dotenv');

dotenv.config();

/**
 * Migration script to populate statusHistory for existing jobs.
 * This runs once to ensure all jobs have at least one history entry.
 */
const migrate = async () => {
    try {
        // Fallback URI similar to db.js if env var is missing
        const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/digital-service-register';

        await mongoose.connect(uri);
        console.log(`Connected to MongoDB at ${uri}`);

        const jobs = await Job.find({});
        console.log(`Found ${jobs.length} jobs to check.`);

        let migratedCount = 0;

        for (const job of jobs) {
            let modified = false;

            // If statusHistory doesn't exist or is empty, initialize it with current status
            if (!job.statusHistory || job.statusHistory.length === 0) {
                job.statusHistory = [{
                    status: job.status,
                    timestamp: job.createdAt || new Date(),
                    note: 'Initial status (migration)'
                }];
                modified = true;
            }

            if (modified) {
                await job.save();
                migratedCount++;
                process.stdout.write('.'); // Progress indicator
            }
        }

        console.log(`\nMigration complete. Updated ${migratedCount} jobs.`);
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrate();
