const express = require('express');
const exportsController = require('../controllers/exports.controller');
const auth = require('../middleware/auth');

const router = express.Router();

router
    .route('/')
    .get(auth(), exportsController.listExports)
    .post(auth(['export']), exportsController.createExport);

router
    .route('/:exportId')
    .get(auth(), exportsController.getExport)
    .delete(auth(), exportsController.deleteExport);

router.route('/:exportId/download').get(auth(), exportsController.downloadExport);

module.exports = router;
