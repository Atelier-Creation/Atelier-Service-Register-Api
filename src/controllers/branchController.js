const Branch = require('../models/Branch');
const User = require('../models/User');

// @desc    Get all branches
// @route   GET /api/branches
// @access  Private (Admin)
const getBranches = async (req, res) => {
    try {
        const branches = await Branch.find({});
        res.json(branches);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get branch by ID
// @route   GET /api/branches/:id
// @access  Private (Admin or Branch Manager of that branch)
const getBranchById = async (req, res) => {
    try {
        const branch = await Branch.findById(req.params.id);
        if (branch) {
            res.json(branch);
        } else {
            res.status(404).json({ message: 'Branch not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a branch
// @route   POST /api/branches
// @access  Private (Admin)
const createBranch = async (req, res) => {
    try {
        const { name, code, address, phone } = req.body;

        const branchExists = await Branch.findOne({ code });
        if (branchExists) {
            return res.status(400).json({ message: 'Branch code already exists' });
        }

        const branch = await Branch.create({
            name,
            code,
            address,
            phone,
        });

        res.status(201).json(branch);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update a branch
// @route   PUT /api/branches/:id
// @access  Private (Admin)
const updateBranch = async (req, res) => {
    try {
        const { name, code, address, phone, isActive } = req.body;

        const branch = await Branch.findById(req.params.id);

        if (branch) {
            branch.name = name || branch.name;
            branch.code = code || branch.code;
            branch.address = address || branch.address;
            branch.phone = phone || branch.phone;
            if (isActive !== undefined) {
                branch.isActive = isActive;
            }

            const updatedBranch = await branch.save();
            res.json(updatedBranch);
        } else {
            res.status(404).json({ message: 'Branch not found' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete a branch
// @route   DELETE /api/branches/:id
// @access  Private (Admin)
const deleteBranch = async (req, res) => {
    try {
        const branch = await Branch.findById(req.params.id);

        if (branch) {
            // Check if there are users associated with this branch
            const usersCount = await User.countDocuments({ branch: branch._id });
            if (usersCount > 0) {
                return res.status(400).json({ message: 'Cannot delete branch with associated users' });
            }

            await branch.deleteOne();
            res.json({ message: 'Branch removed' });
        } else {
            res.status(404).json({ message: 'Branch not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getBranches,
    getBranchById,
    createBranch,
    updateBranch,
    deleteBranch
};
