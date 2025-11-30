const httpStatus = require('http-status').default;
const catchAsync = require('../utils/catchAsync');
const iocsService = require('../services/iocs.service');
const { IOC_TYPES, SEVERITIES } = require('../utils/ioc.utils');

const createIoc = catchAsync(async (req, res) => {
    const ioc = await iocsService.createIoc(req.body, req.user);
    res.status(httpStatus.CREATED).send(ioc);
});

const listIocs = catchAsync(async (req, res) => {
    const filter = {};
    if (req.query.type && IOC_TYPES.includes(req.query.type)) {
        filter.type = req.query.type;
    }
    if (req.query.severity && SEVERITIES.includes(req.query.severity)) {
        filter.severity = req.query.severity;
    }
    if (req.query.tag) {
        filter.tags = req.query.tag;
    }
    if (req.query.search) {
        filter.value = { $regex: req.query.search, $options: 'i' };
    }

    const options = {
        page: req.query.page,
        limit: req.query.limit,
        sortBy: req.query.sort_by,
        sortOrder: req.query.sort_order,
    };

    const result = await iocsService.queryIocs(filter, options);
    res.send(result);
});

const getIoc = catchAsync(async (req, res) => {
    const ioc = await iocsService.getIocById(req.params.iocId);
    res.send(ioc);
});

const updateIoc = catchAsync(async (req, res) => {
    const ioc = await iocsService.updateIoc(req.params.iocId, req.body, req.user);
    res.send(ioc);
});

const deleteIoc = catchAsync(async (req, res) => {
    await iocsService.deleteIoc(req.params.iocId);
    res.send({ message: 'IOC deleted successfully' });
});

const addIocTag = catchAsync(async (req, res) => {
    const ioc = await iocsService.addTag(req.params.iocId, req.body.tag_name, req.user);
    res.send(ioc);
});

const removeIocTag = catchAsync(async (req, res) => {
    const ioc = await iocsService.removeTag(req.params.iocId, req.params.tagName);
    res.send(ioc);
});

const bulkTagIocs = catchAsync(async (req, res) => {
    const result = await iocsService.bulkTag(req.body.ioc_ids, req.body.tag_names, req.user);
    res.send(result);
});

module.exports = {
    createIoc,
    listIocs,
    getIoc,
    updateIoc,
    deleteIoc,
    addIocTag,
    removeIocTag,
    bulkTagIocs,
};
