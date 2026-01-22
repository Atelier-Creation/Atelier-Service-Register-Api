const express = require('express');
const router = express.Router();
const {
    getJobs,
    getJobById,
    createJob,
    updateJob,
    deleteJob,
    getJobStats,
    getDashboardCharts,
    getOutsourceStats,
    getDetailedReports,
} = require('../controllers/jobController');
const { protect, admin } = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Jobs
 *   description: Job management API
 */

/**
 * @swagger
 * /api/jobs:
 *   get:
 *     summary: Get all jobs
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of jobs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Job'
 *   post:
 *     summary: Create a new job
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Job'
 *     responses:
 *       201:
 *         description: Job created successfully
 */
const upload = require('../middleware/uploadMiddleware');

router.route('/').get(protect, getJobs).post(protect, upload.fields([{ name: 'beforeImages', maxCount: 5 }, { name: 'afterImages', maxCount: 5 }]), createJob);

router.route('/stats/overview').get(protect, getJobStats);
router.route('/stats/charts').get(protect, getDashboardCharts);
router.route('/stats/outsource').get(protect, getOutsourceStats);
router.route('/stats/reports').get(protect, admin, getDetailedReports);

router.route('/:id').get(protect, getJobById).put(protect, upload.fields([{ name: 'beforeImages', maxCount: 5 }, { name: 'afterImages', maxCount: 5 }]), updateJob).delete(protect, admin, deleteJob);

module.exports = router;
