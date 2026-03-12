const Job = require('../models/Job');
const Customer = require('../models/Customer');
const whatsappService = require('../services/whatsappService');

// @desc    Get all jobs
// @route   GET /api/jobs
// @access  Private
const getJobs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || '';
        const filter = req.query.filter || 'all';
        const hasOutsourced = req.query.hasOutsourced === 'true';

        const query = {};

        if (req.currentBranch) {
            query.branch = req.currentBranch;
        }

        if (search) {
            query.$or = [
                { customerName: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { jobId: { $regex: search, $options: 'i' } },
                { device: { $regex: search, $options: 'i' } },
                { model: { $regex: search, $options: 'i' } }
            ];
        }

        if (filter !== 'all' && filter !== '') {
            query.status = filter;
        }

        // Filter for jobs that have been outsourced (have outsourced.name field)
        if (hasOutsourced) {
            query['outsourced.name'] = { $exists: true, $ne: null, $ne: '' };
        }

        const count = await Job.countDocuments(query);
        const jobs = await Job.find(query)
            .populate('branch', 'name')
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(limit * (page - 1));

        res.json({
            jobs,
            page,
            pages: Math.ceil(count / limit),
            total: count
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single job
// @route   GET /api/jobs/:id
// @access  Private
const getJobById = async (req, res) => {
    try {
        const query = { jobId: req.params.id };
        if (req.currentBranch) query.branch = req.currentBranch;
        
        const job = await Job.findOne(query).populate('branch', 'name');
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
            warranty,
            isWarranty,
            type,
            address,
            visitDate,
            note
        } = req.body;

        // Auto-generate sequential Job ID if not provided
        if (!jobId) {
            const lastJob = await Job.findOne({ jobId: { $regex: /^\d+$/ } })
                .sort({ jobId: -1 })
                .collation({ locale: "en_US", numericOrdering: true });

            let nextNum = 101;
            if (lastJob && !isNaN(parseInt(lastJob.jobId))) {
                nextNum = parseInt(lastJob.jobId) + 1;
            }
            // Format as 001, 002, etc. (3 digits)
            jobId = nextNum.toString().padStart(3, '0');
        }

        const images = { before: [], after: [] };
        if (req.files) {
            if (req.files.beforeImages) {
                images.before = req.files.beforeImages.map(file => `/uploads/${file.filename}`);
            }
            if (req.files.afterImages) {
                images.after = req.files.afterImages.map(file => `/uploads/${file.filename}`);
            }
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
            warranty,
            isWarranty,
            type,
            address,
            visitDate,
            statusHistory: [{
                status: status || 'received',
                timestamp: new Date(),
                note: note || 'Order created'
            }],
            images,
            branch: req.currentBranch || req.user?.branch // use constrained branch
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
                branch: req.currentBranch || req.user?.branch
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
        const query = { jobId: req.params.id };
        if (req.currentBranch) query.branch = req.currentBranch;

        const job = await Job.findOne(query);

        if (job) {
            // Update fields (exclude immutable fields and statusHistory which is handled separately)
            const { _id, jobId, createdAt, statusHistory, ...updates } = req.body;

            // Parse outsourced field if it's a JSON string (from FormData)
            if (updates.outsourced && typeof updates.outsourced === 'string') {
                try {
                    updates.outsourced = JSON.parse(updates.outsourced);
                } catch (e) {
                    console.error('Failed to parse outsourced field:', e);
                }
            }

            // Track status change
            let statusChanged = false;
            if (updates.status && updates.status !== job.status) {
                statusChanged = true;
                const historyEntry = {
                    status: updates.status,
                    timestamp: new Date(),
                    note: updates.note || `Status updated to ${updates.status}`
                };

                if (job.statusHistory) {
                    job.statusHistory.push(historyEntry);
                } else {
                    job.statusHistory = [historyEntry];
                }
            }

            // Handle images
            if (req.files) {
                if (!job.images) job.images = { before: [], after: [] }; // Ensure structure exists

                if (req.files.beforeImages) {
                    const newImages = req.files.beforeImages.map(file => `/uploads/${file.filename}`);
                    job.images.before = [...(job.images.before || []), ...newImages];
                }
                if (req.files.afterImages) {
                    const newImages = req.files.afterImages.map(file => `/uploads/${file.filename}`);
                    job.images.after = [...(job.images.after || []), ...newImages];
                }
                job.markModified('images');
            }

            Object.assign(job, updates);

            const updatedJob = await job.save();

            // Send WhatsApp Notifications
            if (statusChanged) {
                if (updatedJob.status === 'delivered') {
                    await whatsappService.sendDeliveryNotification(updatedJob);
                } else if (!['outsourced'].includes(updatedJob.status)) { // Don't notify for internal statuses like outsourced if preferred, or do. User said "customer specific".
                    // User said: "received, in-progress, ready, returned, delivered".
                    await whatsappService.sendStatusNotification(updatedJob);
                }
            }

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
        const query = { jobId: req.params.id };
        if (req.currentBranch) query.branch = req.currentBranch;

        const job = await Job.findOne(query);

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
        const query = {};
        if (req.currentBranch) query.branch = req.currentBranch;
        
        const jobs = await Job.find(query);

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

        const custQuery = {};
        if (req.currentBranch) custQuery.branch = req.currentBranch;
        const totalCustomers = await Customer.countDocuments(custQuery);

        res.json({
            total: jobs.length,
            today: todayJobs.length,
            statusCounts,
            totalEarnings,
            pendingPayments,
            totalCustomers,
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

        const query = {
            createdAt: {
                $gte: startDate,
                $lte: endDate
            }
        };
        if (req.currentBranch) query.branch = req.currentBranch;

        const jobs = await Job.find(query);

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
        const query = {
            status: { $in: ['outsourced', 'ready', 'delivered'] },
            'outsourced.name': { $exists: true, $ne: '' }
        };
        if (req.currentBranch) query.branch = req.currentBranch;
        
        const jobs = await Job.find(query);

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
        const month = parseInt(req.query.month); // Optional: 1-12

        let startDate, endDate;

        if (month) {
            // Monthly report
            startDate = new Date(year, month - 1, 1);
            endDate = new Date(year, month, 0, 23, 59, 59);
        } else {
            // Yearly report
            startDate = new Date(year, 0, 1);
            endDate = new Date(year, 11, 31, 23, 59, 59);
        }

        const query = {
            createdAt: { $gte: startDate, $lte: endDate }
        };
        if (req.currentBranch) query.branch = req.currentBranch;

        const jobs = await Job.find(query);

        // Initialize monthly stats
        const monthlyStats = Array.from({ length: 12 }, (_, i) => ({
            month: new Date(0, i).toLocaleString('default', { month: 'short' }),
            totalOrders: 0,
            deliveredOrders: 0,
            walkIn: 0,
            homeService: 0,
            revenue: 0,
            outsourceCost: 0,
            profit: 0
        }));

        const yearlyStats = {
            totalOrders: 0,
            deliveredOrders: 0,
            walkIn: 0,
            homeService: 0,
            revenue: 0,
            outsourceCost: 0,
            profit: 0
        };

        // Device category tracking
        const deviceCounts = {};

        // Customer tracking for top customers
        const customerSpending = {};

        jobs.forEach(job => {
            const jobMonth = new Date(job.createdAt).getMonth();
            const revenue = parseFloat(job.totalAmount) || 0;
            const outsourceCost = job.outsourced ? (parseFloat(job.outsourced.cost) || 0) : 0;
            const profit = revenue - outsourceCost;
            const isWalkIn = job.type !== 'home-service';

            // Update monthly stats
            monthlyStats[jobMonth].totalOrders++;
            if (job.status === 'delivered') monthlyStats[jobMonth].deliveredOrders++;
            if (isWalkIn) {
                monthlyStats[jobMonth].walkIn++;
            } else {
                monthlyStats[jobMonth].homeService++;
            }
            monthlyStats[jobMonth].revenue += revenue;
            monthlyStats[jobMonth].outsourceCost += outsourceCost;
            monthlyStats[jobMonth].profit += profit;

            // Update yearly stats
            yearlyStats.totalOrders++;
            if (job.status === 'delivered') yearlyStats.deliveredOrders++;
            if (isWalkIn) {
                yearlyStats.walkIn++;
            } else {
                yearlyStats.homeService++;
            }
            yearlyStats.revenue += revenue;
            yearlyStats.outsourceCost += outsourceCost;
            yearlyStats.profit += profit;

            // Track device categories
            const deviceType = job.deviceType || 'Other';
            deviceCounts[deviceType] = (deviceCounts[deviceType] || 0) + 1;

            // Track customer spending
            const customerKey = `${job.customerName}|${job.phone}`;
            if (!customerSpending[customerKey]) {
                customerSpending[customerKey] = {
                    name: job.customerName,
                    phone: job.phone,
                    orders: 0,
                    totalSpent: 0
                };
            }
            customerSpending[customerKey].orders++;
            customerSpending[customerKey].totalSpent += revenue;
        });

        // Prepare device breakdown for pie chart
        const deviceBreakdown = Object.entries(deviceCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        // Service type breakdown
        const serviceTypeBreakdown = [
            { name: 'Walk-In', value: yearlyStats.walkIn },
            { name: 'Home Service', value: yearlyStats.homeService }
        ];

        // Top 10 customers by spending
        const topCustomers = Object.values(customerSpending)
            .sort((a, b) => b.totalSpent - a.totalSpent)
            .slice(0, 10);

        res.json({
            year,
            month: month || null,
            monthlyStats,
            yearlyStats,
            deviceBreakdown,
            serviceTypeBreakdown,
            topCustomers
        });
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
