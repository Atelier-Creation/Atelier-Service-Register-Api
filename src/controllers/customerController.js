const mongoose = require('mongoose');
const Customer = require('../models/Customer');

// Helper to cast branch ID for aggregation
const castBranch = (branch) => {
    if (!branch) return null;
    if (typeof branch === 'string') return new mongoose.Types.ObjectId(branch);
    if (branch.$in) {
        return { $in: branch.$in.map(id => new mongoose.Types.ObjectId(id.toString())) };
    }
    return branch;
};

// @desc    Get all customers
// @route   GET /api/customers
// @access  Private
const getCustomers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || '';

        const matchStage = {};
        if (req.currentBranch) {
            matchStage.branch = castBranch(req.currentBranch);
        }

        if (search) {
            matchStage.$or = [
                { name: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
            ];
        }

        const pipeline = [
            { $match: matchStage },
            {
                $lookup: {
                    from: 'jobs',
                    let: { customerPhone: '$phone' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$phone', '$$customerPhone']
                                }
                            }
                        },
                        ...(req.currentBranch ? [{ $match: { branch: castBranch(req.currentBranch) } }] : [])
                    ],
                    as: 'jobs'
                }
            },
            {
                $project: {
                    name: 1,
                    phone: 1,
                    totalJobs: { $size: '$jobs' },
                    lastVisit: { $max: '$jobs.createdAt' },
                    totalSpent: { $sum: '$jobs.totalAmount' },
                    pendingAmount: {
                        $sum: {
                            $map: {
                                input: {
                                    $filter: {
                                        input: '$jobs',
                                        as: 'job',
                                        cond: { $ne: ['$$job.status', 'delivered'] }
                                    }
                                },
                                as: 'job',
                                in: { $subtract: [{ $ifNull: ['$$job.totalAmount', 0] }, { $ifNull: ['$$job.advanceAmount', 0] }] }
                            }
                        }
                    },
                    createdAt: 1 // for default sort
                }
            },
            { $sort: { createdAt: -1 } },
            {
                $facet: {
                    metadata: [{ $count: "total" }],
                    data: [{ $skip: limit * (page - 1) }, { $limit: limit }]
                }
            }
        ];

        const result = await Customer.aggregate(pipeline);

        const customers = result[0].data;
        const total = result[0].metadata[0] ? result[0].metadata[0].total : 0;

        res.json({
            customers,
            page,
            pages: Math.ceil(total / limit),
            total
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getCustomers,
};
