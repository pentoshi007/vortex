const express = require('express');
const tagsController = require('../controllers/tags.controller');
const auth = require('../middleware/auth');

const router = express.Router();

router
    .route('/')
    .get(tagsController.listTags)
    .post(auth(['tag']), tagsController.createTag);

router.route('/stats').get(tagsController.getTagStats);
router.route('/validate').post(auth(), tagsController.validateTagName);

router
    .route('/:tagId')
    .get(auth(), tagsController.getTag)
    .put(auth(['tag']), tagsController.updateTag)
    .delete(auth(['tag']), tagsController.deleteTag);

module.exports = router;
