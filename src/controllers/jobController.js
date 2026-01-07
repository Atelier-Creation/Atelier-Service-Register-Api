const Job = require('../models/Job');
const Customer = require('../models/Customer');

// @desc    Get all jobs
// @route   GET /api/jobs
// @access  Private
const getJobs = async (req, res) => {
    try {
        const jobs = await Job.find().sort({ createdAt: -1 });
        res.json(jobs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single job
// @route   GET /api/jobs/:id
// @access  Private
const getJobById = async (req, res) => {
    try {
        const job = await Job.findOne({ jobId: req.params.id });
        if (job) {
            res.json(job);
        } else {
            res.status(404).json({ message: 'Job not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a job
// @route   POST /api/jobs
// @access  Private
// @desc    Create a job
// @route   POST /api/jobs
// @access  Private
const createJob = async (req, res) => {
    try {
        let {
            jobId,
            customerName,
            phone,
            deviceType,
            brand,
            model,
            device,
            issue,
            receivedDate,
            estimatedDelivery,
            technician,
            advanceAmount,
            totalAmount,
            status,
        } = req.body;

        // Auto-generate sequential Job ID if not provided
        if (!jobId) {
            const lastJob = await Job.findOne({ jobId: { $regex: /^\d+$/ } })
                .sort({ jobId: -1 })
                .collation({ locale: "en_US", numericOrdering: true });

            let nextNum = 1;
            if (lastJob && !isNaN(parseInt(lastJob.jobId))) {
                nextNum = parseInt(lastJob.jobId) + 1;
            }
            // Format as 001, 002, etc. (3 digits)
            jobId = nextNum.toString().padStart(3, '0');
        }

        const job = new Job({
            jobId,
            customerName,
            phone,
            deviceType,
            brand,
            model,
            device,
            issue,
            receivedDate,
            estimatedDelivery,
            technician,
            advanceAmount,
            totalAmount,
            status,
        });

        const createdJob = await job.save();

        // Update or Create Customer
        const customer = await Customer.findOne({ phone });

        if (customer) {
            customer.totalJobs = (customer.totalJobs || 0) + 1;
            await customer.save();
        } else {
            const newCustomer = new Customer({
                id: `CUST${Date.now()}`,
                name: customerName,
                phone,
                totalJobs: 1,
            });
            await newCustomer.save();
        }

        res.status(201).json(createdJob);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update a job
// @route   PUT /api/jobs/:id
// @access  Private
const updateJob = async (req, res) => {
    try {
        const job = await Job.findOne({ jobId: req.params.id });

        if (job) {
            // Update fields (exclude immutable fields)
            const { _id, jobId, createdAt, ...updates } = req.body;
            Object.assign(job, updates);

            const updatedJob = await job.save();
            res.json(updatedJob);
        } else {
            res.status(404).json({ message: 'Job not found' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete a job
// @route   DELETE /api/jobs/:id
// @access  Private (Admin)
const deleteJob = async (req, res) => {
    try {
        const job = await Job.findOne({ jobId: req.params.id });

        if (job) {
            await job.deleteOne();
            res.json({ message: 'Job removed' });
        } else {
            res.status(404).json({ message: 'Job not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get job stats
// @route   GET /api/jobs/stats/overview
// @access  Private
const getJobStats = async (req, res) => {
    try {
        const jobs = await Job.find({});

        const today = new Date().toDateString();
        const todayJobs = jobs.filter(job =>
            new Date(job.createdAt).toDateString() === today
        );

        const statusCounts = jobs.reduce((acc, job) => {
            acc[job.status] = (acc[job.status] || 0) + 1;
            return acc;
        }, {});

        const totalEarnings = jobs
            .filter(job => job.status === 'delivered')
            .reduce((sum, job) => sum + (job.totalAmount || 0), 0);

        const pendingPayments = jobs
            .filter(job => job.status !== 'delivered')
            .reduce((sum, job) => sum + ((job.totalAmount || 0) - (job.advanceAmount || 0)), 0);

        res.json({
            total: jobs.length,
            today: todayJobs.length,
            statusCounts,
            totalEarnings,
            pendingPayments,
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get dashboard chart data
// @route   GET /api/jobs/stats/charts
// @access  Private
// @desc    Get dashboard chart data
// @route   GET /api/jobs/stats/charts
// @access  Private
const getDashboardCharts = async (req, res) => {
    try {
        const period = req.query.period || 'year';
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();

        let startDate, endDate, labels;

        if (period === 'month') {
            startDate = new Date(year, month, 1);
            endDate = new Date(year, month + 1, 0, 23, 59, 59);
            const daysInMonth = endDate.getDate();
            labels = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString());
        } else {
            startDate = new Date(year, 0, 1);
            endDate = new Date(year, 11, 31, 23, 59, 59);
            labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        }

        const jobs = await Job.find({
            createdAt: {
                $gte: startDate,
                $lte: endDate
            }
        });

        const chartData = labels.map((label, index) => {
            let periodJobs;
            if (period === 'month') {
                periodJobs = jobs.filter(job => new Date(job.createdAt).getDate() === (index + 1));
            } else {
                periodJobs = jobs.filter(job => new Date(job.createdAt).getMonth() === index);
            }

            const sales = periodJobs.reduce((sum, job) => sum + (parseFloat(job.totalAmount) || 0), 0);

            // Profit calculation: Sales - Outsource Cost
            const cost = periodJobs.reduce((sum, job) => {
                const outsourceCost = job.outsourced ? (parseFloat(job.outsourced.cost) || 0) : 0;
                return sum + outsourceCost;
            }, 0);

            return {
                name: label,
                sales,
                profit: sales - cost
            };
        });

        // Category (Device Type) Distribution
        // We use 'deviceType' field which is "Mobile", "Laptop", etc.
        const categoryMap = {};
        jobs.forEach(job => {
            const type = job.deviceType || 'Other';
            categoryMap[type] = (categoryMap[type] || 0) + 1;
        });

        const pieData = Object.keys(categoryMap).map(key => ({
            name: key,
            value: categoryMap[key]
        }));

        res.json({ chartData, pieData });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get outsource statistics
// @route   GET /api/jobs/stats/outsource
// @access  Private
const getOutsourceStats = async (req, res) => {
    try {
        const jobs = await Job.find({
            status: { $in: ['outsourced', 'ready', 'delivered'] },
            'outsourced.name': { $exists: true, $ne: '' }
        });

        const vendorStats = {};

        jobs.forEach(job => {
            const vendorName = job.outsourced.name;
            const jobDate = job.outsourced.date ? new Date(job.outsourced.date) : new Date(job.updatedAt);

            if (!vendorStats[vendorName]) {
                vendorStats[vendorName] = {
                    name: vendorName,
                    totalJobs: 0,
                    totalCost: 0,
                    activeJobs: 0,
                    completedJobs: 0,
                    lastActive: jobDate // Initialize
                };
            }

            vendorStats[vendorName].totalJobs += 1;
            vendorStats[vendorName].totalCost += (parseFloat(job.outsourced.cost) || 0);

            if (job.status === 'outsourced') {
                vendorStats[vendorName].activeJobs += 1;
            } else {
                vendorStats[vendorName].completedJobs += 1;
            }

            // Update lastActive if this job is newer
            if (jobDate > vendorStats[vendorName].lastActive) {
                vendorStats[vendorName].lastActive = jobDate;
            }
        });

        const statsArray = Object.values(vendorStats).sort((a, b) => b.totalJobs - a.totalJobs);
        res.json(statsArray);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get detailed reports (Analytics)
// @route   GET /api/jobs/stats/reports
// @access  Private (Admin)
const getDetailedReports = async (req, res) => {
    try {
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31, 23, 59, 59);

        const jobs = await Job.find({
            createdAt: { $gte: startDate, $lte: endDate }
        });

        // Initialize monthly stats
        const monthlyStats = Array.from({ length: 12 }, (_, i) => ({
            month: new Date(0, i).toLocaleString('default', { month: 'short' }),
            totalOrders: 0,
            deliveredOrders: 0,
            revenue: 0,
            outsourceCost: 0,
            profit: 0
        }));

        const yearlyStats = {
            totalOrders: 0,
            deliveredOrders: 0,
            revenue: 0,
            outsourceCost: 0,
            profit: 0
        };

        jobs.forEach(job => {
            const month = new Date(job.createdAt).getMonth();
            const revenue = parseFloat(job.totalAmount) || 0;
            const outsourceCost = job.outsourced ? (parseFloat(job.outsourced.cost) || 0) : 0;
            const profit = revenue - outsourceCost;

            // Update monthly
            monthlyStats[month].totalOrders++;
            if (job.status === 'delivered') monthlyStats[month].deliveredOrders++;
            monthlyStats[month].revenue += revenue;
            monthlyStats[month].outsourceCost += outsourceCost;
            monthlyStats[month].profit += profit;

            // Update yearly
            yearlyStats.totalOrders++;
            if (job.status === 'delivered') yearlyStats.deliveredOrders++;
            yearlyStats.revenue += revenue;
            yearlyStats.outsourceCost += outsourceCost;
            yearlyStats.profit += profit;
        });

        res.json({ year, monthlyStats, yearlyStats });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getJobs,
    getJobById,
    createJob,
    updateJob,
    deleteJob,
    getJobStats,
    getDashboardCharts,
    getOutsourceStats,
    getDetailedReports
};
