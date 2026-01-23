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

    if (!username || !password) {
        return res.status(400).json({ message: 'Please provide both username and password' });
    }

    const user = await User.findOne({ username });

    if (user && (await user.matchPassword(password))) {
        res.json({
            _id: user._id,
            username: user.username,
            name: user.name,
            role: user.role,
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
// @access  Private (Admin)
const getUsers = async (req, res) => {
    try {
        const users = await User.find({}).select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a new user (Admin specific)
// @route   POST /api/auth/users
// @access  Private (Admin)
const createUser = async (req, res) => {
    try {
        const { username, password, name, role } = req.body;

        // Check limit: 1 non-admin user allowed
        // Only enforce limit if trying to create non-admin, or maybe strictly enforce 1 extra account regardless of role?
        // "admin can create only 1 user account".
        const existingStaff = await User.countDocuments({ role: { $ne: 'admin' } });

        // If we want to be strict: 
        if (role !== 'admin' && existingStaff >= 1) {
            return res.status(400).json({ message: 'User limit reached. Only 1 additional user account is allowed.' });
        }

        const userExists = await User.findOne({ username });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = await User.create({
            username,
            password,
            name,
            role: role || 'technician',
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                username: user.username,
                name: user.name,
                role: user.role,
            });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete user
// @route   DELETE /api/auth/users/:id
// @access  Private (Admin)
const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (user) {
            if (user.role === 'admin') {
                return res.status(400).json({ message: 'Cannot delete admin user' });
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
