const express = require('express');
const iocsController = require('../controllers/iocs.controller');
const auth = require('../middleware/auth');

const router = express.Router();

router
    .route('/')
    .get(iocsController.listIocs)
    .post(auth(['write']), iocsController.createIoc);

router.route('/bulk-tag').post(auth(['tag']), iocsController.bulkTagIocs);

router
    .route('/:iocId')
    .get(iocsController.getIoc)
    .put(auth(['write']), iocsController.updateIoc)
    .delete(auth(['write']), iocsController.deleteIoc);

router.route('/:iocId/tags').post(auth(['tag']), iocsController.addIocTag);

router.route('/:iocId/tags/:tagName').delete(auth(['tag']), iocsController.removeIocTag);

module.exports = router;
