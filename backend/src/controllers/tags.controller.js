const httpStatus = require('http-status').default;
const catchAsync = require('../utils/catchAsync');
const tagsService = require('../services/tags.service');

const createTag = catchAsync(async (req, res) => {
    const tag = await tagsService.createTag(req.body, req.user);
    res.status(httpStatus.CREATED).send(tag);
});

const listTags = catchAsync(async (req, res) => {
    const filter = {};
    if (req.query.search) {
        filter.$or = [
            { name: { $regex: req.query.search, $options: 'i' } },
            { description: { $regex: req.query.search, $options: 'i' } },
        ];
    }

    const options = {
        sortBy: req.query.sort_by,
        sortOrder: req.query.sort_order,
    };

    const tags = await tagsService.queryTags(filter, options);
    res.send({ tags, total: tags.length });
});

const getTag = catchAsync(async (req, res) => {
    const tag = await tagsService.getTagById(req.params.tagId);
    res.send(tag);
});

const updateTag = catchAsync(async (req, res) => {
    const tag = await tagsService.updateTag(req.params.tagId, req.body);
    res.send(tag);
});

const deleteTag = catchAsync(async (req, res) => {
    await tagsService.deleteTag(req.params.tagId);
    res.send({ message: 'Tag deleted successfully' });
});

const getTagStats = catchAsync(async (req, res) => {
    const stats = await tagsService.getTagStats();
    res.send(stats);
});

const validateTagName = catchAsync(async (req, res) => {
    const result = await tagsService.validateTagName(req.body.name);
    res.send(result);
});

module.exports = {
    createTag,
    listTags,
    getTag,
    updateTag,
    deleteTag,
    getTagStats,
    validateTagName,
};
