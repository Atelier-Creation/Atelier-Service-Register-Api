const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '24h',
    });
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    const { username, password } = req.body;
    console.log(`[AUTH] Login attempt for: ${username}`);

    if (!username || !password) {
        return res.status(400).json({ message: 'Please provide both username and password' });
    }

    const user = await User.findOne({ username }).populate('branches', 'name code');

    if (user && (await user.matchPassword(password))) {
        res.json({
            _id: user._id,
            username: user.username,
            name: user.name,
            role: user.role,
            branch: user.branches?.[0], // For backward compatibility in some frontend parts, or just send branches
            branches: user.branches,
            token: generateToken(user._id),
        });
    } else {
        res.status(401).json({ message: 'Invalid username or password' });
    }
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public (or Admin only, depending on reqs. Making public for setup)
const registerUser = async (req, res) => {
    const { username, password, name, role } = req.body;

    const userExists = await User.findOne({ username });

    if (userExists) {
        return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
        username,
        password,
        name,
        role,
    });

    if (user) {
        res.status(201).json({
            _id: user._id,
            username: user.username,
            name: user.name,
            role: user.role,
            token: generateToken(user._id),
        });
    } else {
        res.status(400).json({ message: 'Invalid user data' });
    }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateUserProfile = async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        user.name = req.body.name || user.name;
        // Optional: Allow username update if unique? Let's check uniqueness or just allow for now.
        // If username changes, we should ideally check for duplicates.
        if (req.body.username && req.body.username !== user.username) {
            const userExists = await User.findOne({ username: req.body.username });
            if (userExists) {
                return res.status(400).json({ message: 'Username already taken' });
            }
            user.username = req.body.username;
        }

        if (req.body.password) {
            user.password = req.body.password;
        }

        const updatedUser = await user.save();

        res.json({
            _id: updatedUser._id,
            username: updatedUser.username,
            name: updatedUser.name,
            role: updatedUser.role,
            token: generateToken(updatedUser._id),
        });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

// @desc    Get all users
// @route   GET /api/auth/users
// @access  Private (Admin or Branch Manager)
const getUsers = async (req, res) => {
    try {
        let query = {};
        if (req.user.role === 'branch_manager') {
            query.branches = { $in: req.user.branches };
        }
        const users = await User.find(query).select('-password').populate('branches', 'name code');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a new user (Admin or Branch Manager)
// @route   POST /api/auth/users
// @access  Private (Admin or Branch Manager)
const createUser = async (req, res) => {
    try {
        let { username, password, name, role, branch, branches } = req.body;

        if (req.user.role === 'branch_manager') {
            role = 'technician';
            branches = req.user.branches;
        } else if (req.user.role === 'admin') {
            role = role || 'technician';
            // handle both single branch and multiple branches from frontend
            if (!branches && branch) branches = [branch];
        }

        const userExists = await User.findOne({ username });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = await User.create({
            username,
            password,
            name,
            role,
            branches: branches || [],
        });

        if (user) {
            const populatedUser = await User.findById(user._id).select('-password').populate('branches', 'name code');
            res.status(201).json(populatedUser);
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete user
// @route   DELETE /api/auth/users/:id
// @access  Private (Admin or Branch Manager)
const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (user) {
            if (user.role === 'admin') {
                return res.status(400).json({ message: 'Cannot delete admin user' });
            }
            if (req.user.role === 'branch_manager') {
                if (user.branch.toString() !== req.user.branch.toString()) {
                     return res.status(401).json({ message: 'Not authorized to delete this user' });
                }
                if (user.role === 'branch_manager') {
                     return res.status(400).json({ message: 'Branch manager cannot delete another branch manager' });
                }
            }
            await user.deleteOne();
            res.json({ message: 'User removed' });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { loginUser, registerUser, updateUserProfile, getUsers, createUser, deleteUser };
