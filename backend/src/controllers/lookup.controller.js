const httpStatus = require('http-status').default;
const catchAsync = require('../utils/catchAsync');
const lookupService = require('../services/lookup.service');

const performLookup = catchAsync(async (req, res) => {
    const result = await lookupService.performLookup(req.body.indicator, req.user.id);
    res.status(httpStatus.CREATED).send({
        ioc: result.ioc,
        lookup_id: result.lookup._id,
        status: result.lookup.status,
    });
});

const lookupHistory = catchAsync(async (req, res) => {
    const filter = { user_id: req.user.id };
    if (req.query.status) {
        filter.status = req.query.status;
    }
    if (req.query.date_from) {
        filter.started_at = { $gte: new Date(req.query.date_from) };
    }
    if (req.query.date_to) {
        filter.started_at = { ...filter.started_at, $lte: new Date(req.query.date_to) };
    }

    const options = {
        page: req.query.page,
        limit: req.query.limit,
    };

    const result = await lookupService.getLookupHistory(filter, options);
    res.send(result);
});

const getLookup = catchAsync(async (req, res) => {
    const lookup = await lookupService.getLookupById(req.params.lookupId);
    if (lookup.user_id !== req.user.id) {
        res.status(httpStatus.FORBIDDEN).send({ error: 'Access denied' });
        return;
    }
    res.send(lookup);
});

const deleteLookup = catchAsync(async (req, res) => {
    const lookup = await lookupService.getLookupById(req.params.lookupId);
    if (lookup.user_id !== req.user.id) {
        res.status(httpStatus.FORBIDDEN).send({ error: 'Access denied' });
        return;
    }
    await lookupService.deleteLookup(req.params.lookupId);
    res.send({ message: 'Lookup deleted successfully' });
});

module.exports = {
    performLookup,
    lookupHistory,
    getLookup,
    deleteLookup,
};
