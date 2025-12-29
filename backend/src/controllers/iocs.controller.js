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
    
    // Type filter
    if (req.query.type && IOC_TYPES.includes(req.query.type)) {
        filter.type = req.query.type;
    }
    
    // Severity filter
    if (req.query.severity && SEVERITIES.includes(req.query.severity)) {
        filter.severity = req.query.severity;
    }
    
    // Tags filter (supports both 'tag' and 'tags' params)
    const tagQuery = req.query.tag || req.query.tags;
    if (tagQuery) {
        // Support comma-separated tags
        const tagList = tagQuery.split(',').map(t => t.trim()).filter(Boolean);
        if (tagList.length === 1) {
            filter.tags = tagList[0];
        } else if (tagList.length > 1) {
            filter.tags = { $in: tagList };
        }
    }
    
    // Search filter (supports both 'search' and 'q' params)
    const searchQuery = req.query.search || req.query.q;
    if (searchQuery) {
        filter.value = { $regex: searchQuery, $options: 'i' };
    }
    
    // Threat category filter (searches in tags for malware, phishing, botnet, ransomware)
    if (req.query.threat_category) {
        const category = req.query.threat_category.toLowerCase();
        // Match tags that contain the threat category
        if (filter.tags) {
            // Combine with existing tag filter using $and
            filter.$and = filter.$and || [];
            filter.$and.push({ tags: filter.tags });
            filter.$and.push({ tags: { $regex: category, $options: 'i' } });
            delete filter.tags;
        } else {
            filter.tags = { $regex: category, $options: 'i' };
        }
    }
    
    // Score filters
    if (req.query.score_min || req.query.score_max) {
        filter.score = {};
        if (req.query.score_min) {
            filter.score.$gte = parseInt(req.query.score_min, 10);
        }
        if (req.query.score_max) {
            filter.score.$lte = parseInt(req.query.score_max, 10);
        }
    }
    
    // VirusTotal positives filter
    if (req.query.vt_positives_min) {
        filter['vt.positives'] = { $gte: parseInt(req.query.vt_positives_min, 10) };
    }
    
    // Has VT data filter
    if (req.query.has_vt_data === 'true') {
        filter['vt.positives'] = { $exists: true };
    }
    
    // Has AbuseIPDB data filter
    if (req.query.has_abuseipdb_data === 'true') {
        filter['abuseipdb.abuse_confidence'] = { $exists: true };
    }
    
    // Date range filters (from/to based on last_seen)
    if (req.query.from || req.query.to) {
        filter.last_seen = {};
        if (req.query.from) {
            filter.last_seen.$gte = new Date(req.query.from);
        }
        if (req.query.to) {
            // Add one day to include the entire 'to' date
            const toDate = new Date(req.query.to);
            toDate.setDate(toDate.getDate() + 1);
            filter.last_seen.$lte = toDate;
        }
    }

    const options = {
        page: req.query.page || req.query.per_page ? req.query.page : 1,
        limit: req.query.limit || req.query.per_page || 50,
        sortBy: req.query.sort_by || 'last_seen',
        sortOrder: req.query.sort_order || 'desc',
    };

    const result = await iocsService.queryIocs(filter, options);
    
    // Add has_more flag for pagination
    result.has_more = result.pagination.page < result.pagination.pages;
    result.total = result.pagination.total;
    
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
