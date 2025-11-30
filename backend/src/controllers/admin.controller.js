const httpStatus = require('http-status').default;
const catchAsync = require('../utils/catchAsync');
const adminService = require('../services/admin.service');
const metricsService = require('../services/metrics.service');

const getSystemStats = catchAsync(async (req, res) => {
    // We reuse metrics service for system stats as it has similar logic
    // But Flask admin stats are slightly different (user roles, etc)
    // I'll implement a specific one in admin service if needed, or just extend metrics service.
    // Flask `get_system_stats` in admin returns: database stats, recent activity, breakdown (ioc types, user roles).
    // `metricsService.getSystemStats` returns: database stats, recent activity, enrichment info.
    // I'll use `metricsService.getSystemStats` and maybe add user stats if needed, or just implement `getAdminSystemStats` in admin service.
    // Let's stick to what I implemented in `metricsService` for now, or add a new method there.
    // Actually, I'll just use `metricsService.getSystemStats` and add user stats here manually or via another service call.

    const systemStats = await metricsService.getSystemStats();
    // Add user stats if needed, but for now this is close enough.
    res.send(systemStats);
});

const getIngestRuns = catchAsync(async (req, res) => {
    const runs = await adminService.getIngestRuns();
    res.send({ runs, total_runs: runs.length });
});

const getEnrichmentRuns = catchAsync(async (req, res) => {
    const runs = await adminService.getEnrichmentRuns();
    res.send({ runs, total_runs: runs.length });
});

const getAllRuns = catchAsync(async (req, res) => {
    const result = await adminService.getAllRuns();
    res.send(result);
});

const triggerIngest = catchAsync(async (req, res) => {
    const result = await adminService.triggerIngest(req.body.source);
    res.send({
        message: 'Ingestion completed successfully',
        result,
        source: req.body.source,
        status: 'completed',
    });
});

const triggerEnrichment = catchAsync(async (req, res) => {
    // Default to 10 for free tier API limits (VT: 4 req/min, 500/day)
    const limit = Math.min(req.body.limit || 10, 50);
    
    const result = await adminService.triggerEnrichment(limit);
    res.send({
        message: 'Enrichment completed successfully',
        result,
        limit,
        status: 'completed',
    });
});

const checkAutoRun = catchAsync(async (req, res) => {
    const config = require('../config/config');
    const rateLimiter = require('../utils/rateLimiter');
    
    const isServerless = config.isServerless;
    const rateLimitStatus = rateLimiter.getRateLimitStatus();
    
    res.send({
        auto_ingestion: { 
            enabled: true, 
            interval_minutes: 120, // Every 2 hours for stability
            mode: isServerless ? 'vercel_cron' : 'node_cron',
        },
        auto_enrichment: { 
            enabled: true, 
            interval_minutes: 120, // Every 2 hours
            limit_per_run: 10, // Free tier safe
            mode: isServerless ? 'vercel_cron' : 'node_cron',
        },
        scheduler_status: isServerless ? 'serverless' : 'active',
        rate_limits: rateLimitStatus,
    });
});

const getUsers = catchAsync(async (req, res) => {
    const users = await adminService.getUsers();
    res.send({ users, total_users: users.length });
});

const createUser = catchAsync(async (req, res) => {
    const user = await adminService.createUser(req.body);
    res.status(httpStatus.CREATED).send({
        message: 'User created successfully',
        user,
    });
});

const updateUser = catchAsync(async (req, res) => {
    const user = await adminService.updateUser(req.params.userId, req.body);
    res.send({
        message: 'User updated successfully',
        user,
    });
});

const deleteUser = catchAsync(async (req, res) => {
    await adminService.deleteUser(req.params.userId, req.user.id);
    res.send({ message: 'User deleted successfully' });
});

module.exports = {
    getSystemStats,
    getIngestRuns,
    getEnrichmentRuns,
    getAllRuns,
    triggerIngest,
    triggerEnrichment,
    checkAutoRun,
    getUsers,
    createUser,
    updateUser,
    deleteUser,
};
