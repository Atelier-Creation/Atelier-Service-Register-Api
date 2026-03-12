const express = require('express');
const router = express.Router();
const {
    getBranches,
    getBranchById,
    createBranch,
    updateBranch,
    deleteBranch
} = require('../controllers/branchController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, admin, getBranches)
    .post(protect, admin, createBranch);

router.route('/:id')
    .get(protect, getBranchById)
    .put(protect, admin, updateBranch)
    .delete(protect, admin, deleteBranch);

module.exports = router;
