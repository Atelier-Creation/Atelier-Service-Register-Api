const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            req.user = await User.findById(decoded.id).select('-password');

            // Set current branch constraint
            if (req.user.role === 'admin') {
                const requestedBranch = req.headers['x-branch-id'];
                req.currentBranch = (requestedBranch && requestedBranch !== 'all') ? requestedBranch : null;
                console.log(`[AUTH] Admin Branch Access: ${req.currentBranch || 'All'}`);
            } else {
                // Branch managers and technicians are restricted to their assigned branches
                const requestedBranch = req.headers['x-branch-id'];
                const allowedBranches = req.user.branches || [];

                if (requestedBranch && requestedBranch !== 'all') {
                    // Check if the requested branch is in user's allowed list
                    if (allowedBranches.some(b => b.toString() === requestedBranch)) {
                        req.currentBranch = requestedBranch;
                    } else {
                        // Fallback or unauthorized? Let's fallback to all allowed
                        req.currentBranch = { $in: allowedBranches };
                    }
                } else {
                    // No specific branch requested or "all" requested
                    req.currentBranch = { $in: allowedBranches };
                }
                console.log(`[AUTH] User Branch Restrict: ${JSON.stringify(req.currentBranch)}`);
            }

            next();
        } catch (error) {
            console.error('JWT Error:', error.message);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized as an admin' });
    }
};

const adminOrBranchManager = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'branch_manager')) {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized' });
    }
};

module.exports = { protect, admin, adminOrBranchManager };
