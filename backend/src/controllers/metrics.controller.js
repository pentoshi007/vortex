const catchAsync = require('../utils/catchAsync');
const metricsService = require('../services/metrics.service');

const getOverview = catchAsync(async (req, res) => {
    const metrics = await metricsService.getOverview();
    res.send(metrics);
});

const getTimeseries = catchAsync(async (req, res) => {
    const days = req.query.days ? parseInt(req.query.days) : 30;
    const metrics = await metricsService.getTimeseries(days);
    res.send(metrics);
});

const getThreats = catchAsync(async (req, res) => {
    const metrics = await metricsService.getThreats();
    res.send(metrics);
});

const getSystemStats = catchAsync(async (req, res) => {
    const stats = await metricsService.getSystemStats();
    res.send(stats);
});

module.exports = {
    getOverview,
    getTimeseries,
    getThreats,
    getSystemStats,
};
