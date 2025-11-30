const express = require('express');
const lookupController = require('../controllers/lookup.controller');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/', auth(), lookupController.performLookup);
router.get('/history', auth(), lookupController.lookupHistory);

router
    .route('/:lookupId')
    .get(auth(), lookupController.getLookup)
    .delete(auth(), lookupController.deleteLookup);

module.exports = router;
