const httpStatus = require('http-status').default;
const Indicator = require('../models/indicator.model');
const Tag = require('../models/tag.model');
const { ApiError } = require('../middleware/error');
const { validateIocData, SEVERITIES } = require('../utils/ioc.utils');

const createIoc = async (iocBody, user) => {
    const { type, value, error } = validateIocData(iocBody);
    if (error) {
        throw new ApiError(httpStatus.BAD_REQUEST, error);
    }

    const existingIoc = await Indicator.findOne({ type, value });
    if (existingIoc) {
        throw new ApiError(httpStatus.CONFLICT, 'IOC already exists');
    }

    const ioc = new Indicator({
        type,
        value,
        score: iocBody.score || 0,
        severity: iocBody.severity || 'info',
        sources: iocBody.sources || [],
        tags: iocBody.tags || [],
    });

    // Add source
    ioc.sources.push({
        name: 'manual_entry',
        first_seen: new Date(),
        last_seen: new Date(),
        ref: `Created by user ${user.username}`,
    });

    await ioc.save();
    return ioc;
};

const queryIocs = async (filter, options) => {
    const { page = 1, limit = 50, sortBy = 'last_seen', sortOrder = 'desc' } = options;
    const skip = (page - 1) * limit;

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const iocs = await Indicator.find(filter).sort(sort).skip(skip).limit(limit);
    const total = await Indicator.countDocuments(filter);

    return {
        iocs,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
        },
    };
};

const getIocById = async (id) => {
    const ioc = await Indicator.findById(id);
    if (!ioc) {
        throw new ApiError(httpStatus.NOT_FOUND, 'IOC not found');
    }
    return ioc;
};

const updateIoc = async (id, updateBody, user) => {
    const ioc = await getIocById(id);

    if (updateBody.score !== undefined) {
        ioc.score = Math.max(0, Math.min(100, parseInt(updateBody.score)));
        ioc.updateSeverity();
    }

    if (updateBody.severity && SEVERITIES.includes(updateBody.severity)) {
        ioc.severity = updateBody.severity;
    }

    if (updateBody.tags) {
        ioc.tags = updateBody.tags;
    }

    if (updateBody.sources) {
        ioc.sources = updateBody.sources;
    }

    await ioc.save();
    return ioc;
};

const deleteIoc = async (id) => {
    const ioc = await getIocById(id);
    await ioc.deleteOne();
    return ioc;
};

const addTag = async (id, tagName, user) => {
    const ioc = await getIocById(id);
    const tag = await Tag.findOne({ name: tagName });

    if (!tag) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Tag does not exist');
    }

    if (!ioc.tags.includes(tagName)) {
        ioc.tags.push(tagName);
        await ioc.save();
    }

    return ioc;
};

const removeTag = async (id, tagName) => {
    const ioc = await getIocById(id);
    ioc.tags = ioc.tags.filter((t) => t !== tagName);
    await ioc.save();
    return ioc;
};

const bulkTag = async (iocIds, tagNames, user) => {
    // Validate tags
    for (const tagName of tagNames) {
        const tag = await Tag.findOne({ name: tagName });
        if (!tag) {
            throw new ApiError(httpStatus.NOT_FOUND, `Tag "${tagName}" does not exist`);
        }
    }

    const updatedIocs = [];
    const errors = [];

    for (const iocId of iocIds) {
        try {
            const ioc = await Indicator.findById(iocId);
            if (!ioc) {
                errors.push(`IOC not found: ${iocId}`);
                continue;
            }

            let modified = false;
            for (const tagName of tagNames) {
                if (!ioc.tags.includes(tagName)) {
                    ioc.tags.push(tagName);
                    modified = true;
                }
            }

            if (modified) {
                await ioc.save();
            }
            updatedIocs.push(ioc);
        } catch (error) {
            errors.push(`Error updating IOC ${iocId}: ${error.message}`);
        }
    }

    return {
        updated_iocs: updatedIocs,
        errors,
        success_count: updatedIocs.length,
        error_count: errors.length,
    };
};

module.exports = {
    createIoc,
    queryIocs,
    getIocById,
    updateIoc,
    deleteIoc,
    addTag,
    removeTag,
    bulkTag,
};
