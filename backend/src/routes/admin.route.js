const express = require('express');
const adminController = require('../controllers/admin.controller');
const auth = require('../middleware/auth');

const router = express.Router();

// All routes require admin permission
const adminAuth = auth(['admin']);

router.get('/system/stats', adminAuth, adminController.getSystemStats);
router.get('/ingest/runs', adminAuth, adminController.getIngestRuns);
router.get('/enrichment/runs', adminAuth, adminController.getEnrichmentRuns);
router.get('/all-runs', adminAuth, adminController.getAllRuns);
router.post('/ingest/run', adminAuth, adminController.triggerIngest);
router.post('/enrichment/run', adminAuth, adminController.triggerEnrichment);
router.get('/auto-run/check', adminAuth, adminController.checkAutoRun);
router.get('/cleanup/preview', adminAuth, adminController.getCleanupPreview);
router.post('/cleanup/run', adminAuth, adminController.triggerCleanup);

router
    .route('/users')
    .get(adminAuth, adminController.getUsers)
    .post(adminAuth, adminController.createUser);

router
    .route('/users/:userId')
    .patch(adminAuth, adminController.updateUser)
    .delete(adminAuth, adminController.deleteUser);

module.exports = router;
