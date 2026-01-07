exports.getDetailedReports = async (req, res) => {
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
