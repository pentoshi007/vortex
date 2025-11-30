const httpStatus = require('http-status').default;
const Tag = require('../models/tag.model');
const Indicator = require('../models/indicator.model');
const { ApiError } = require('../middleware/error');

const createTag = async (tagBody, user) => {
    if (await Tag.findOne({ name: tagBody.name })) {
        throw new ApiError(httpStatus.CONFLICT, 'Tag already exists');
    }

    const tag = await Tag.create({
        ...tagBody,
        created_by: user.id,
    });
    return tag;
};

const queryTags = async (filter, options) => {
    const { sortBy = 'name', sortOrder = 'asc' } = options;
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const tags = await Tag.find(filter).sort(sort);
    return tags;
};

const getTagById = async (id) => {
    const tag = await Tag.findById(id);
    if (!tag) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Tag not found');
    }
    return tag;
};

const updateTag = async (id, updateBody) => {
    const tag = await getTagById(id);

    if (updateBody.name && (await Tag.findOne({ name: updateBody.name, _id: { $ne: id } }))) {
        throw new ApiError(httpStatus.CONFLICT, 'Tag name already exists');
    }

    Object.assign(tag, updateBody);
    await tag.save();
    return tag;
};

const deleteTag = async (id) => {
    const tag = await getTagById(id);

    // Check usage
    const usageCount = await Indicator.countDocuments({ tags: tag.name });
    if (usageCount > 0) {
        throw new ApiError(httpStatus.CONFLICT, `Cannot delete tag that is in use by ${usageCount} IOC(s)`);
    }

    await tag.deleteOne();
    return tag;
};

const getTagStats = async () => {
    const totalTags = await Tag.countDocuments();
    const tags = await Tag.find();

    const pipeline = [
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
    ];

    const usageResult = await Indicator.aggregate(pipeline);
    const usageMap = {};
    usageResult.forEach(item => {
        usageMap[item._id] = item.count;
    });

    const tagsWithUsage = tags.map(tag => ({
        ...tag.toJSON(),
        usage_count: usageMap[tag.name] || 0
    })).sort((a, b) => b.usage_count - a.usage_count);

    return {
        total_tags: totalTags,
        total_usage: usageResult.reduce((acc, curr) => acc + curr.count, 0),
        tags: tagsWithUsage,
        usage_breakdown: usageMap
    };
};

const validateTagName = async (name) => {
    const tag = await Tag.findOne({ name });
    if (tag) {
        return { valid: false, message: 'Tag name already exists', existing_tag: tag };
    }
    return { valid: true, message: 'Tag name is available' };
};

module.exports = {
    createTag,
    queryTags,
    getTagById,
    updateTag,
    deleteTag,
    getTagStats,
    validateTagName,
};
