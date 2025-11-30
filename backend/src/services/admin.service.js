const User = require('../models/user.model');
const EnrichmentRun = require('../models/enrichment_run.model');
const ingestionService = require('./ingestion.service');
const lookupService = require('./lookup.service');
const { ApiError } = require('../middleware/error');
const httpStatus = require('http-status').default;

const getIngestRuns = async (limit = 50) => {
    return EnrichmentRun.find({ operation: 'ingestion' })
        .sort({ started_at: -1 })
        .limit(limit);
};

const getAllRuns = async (limit = 100) => {
    const runs = await EnrichmentRun.find().sort({ started_at: -1 }).limit(limit);
    const summary = {
        total_runs: runs.length,
        successful_runs: runs.filter(r => r.status === 'completed').length,
        failed_runs: runs.filter(r => r.status === 'error' || r.status === 'failed').length,
    };
    summary.success_rate = summary.total_runs > 0 ? (summary.successful_runs / summary.total_runs) * 100 : 0;

    return { runs, summary };
};

const getEnrichmentRuns = async (limit = 50) => {
    return EnrichmentRun.find({ operation: 'enrichment' })
        .sort({ started_at: -1 })
        .limit(limit);
};

const triggerIngest = async (source) => {
    if (source === 'urlhaus' || source === 'manual') {
        return ingestionService.fetchAndIngest(source);
    }
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid ingestion source');
};

const triggerEnrichment = async (limit) => {
    return lookupService.bulkEnrichRecentIocs(limit);
};

const getUsers = async () => {
    return User.find({}, { password: 0 });
};

const createUser = async (userBody) => {
    if (await User.isEmailTaken(userBody.email)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
    }
    if (await User.findOne({ username: userBody.username })) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Username already taken');
    }
    return User.create(userBody);
};

const updateUser = async (userId, updateBody) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }
    Object.assign(user, updateBody);
    await user.save();
    return user;
};

const deleteUser = async (userId, currentUserId) => {
    if (userId === currentUserId) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot delete your own account');
    }
    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }
    await user.deleteOne();
    return user;
};

module.exports = {
    getIngestRuns,
    getEnrichmentRuns,
    getAllRuns,
    triggerIngest,
    triggerEnrichment,
    getUsers,
    createUser,
    updateUser,
    deleteUser,
};
