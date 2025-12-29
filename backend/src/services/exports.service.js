const httpStatus = require('http-status').default;
const crypto = require('crypto');
const { Parser } = require('json2csv');
const Export = require('../models/export.model');
const Indicator = require('../models/indicator.model');
const { ApiError } = require('../middleware/error');
const logger = require('../config/logger');

/**
 * Convert IOC type to STIX 2.1 indicator pattern
 */
const iocToStixPattern = (ioc) => {
    switch (ioc.type) {
        case 'ip':
            return `[ipv4-addr:value = '${ioc.value}']`;
        case 'domain':
            return `[domain-name:value = '${ioc.value}']`;
        case 'url':
            // Escape single quotes in URL
            const escapedUrl = ioc.value.replace(/'/g, "\\'");
            return `[url:value = '${escapedUrl}']`;
        case 'md5':
            return `[file:hashes.MD5 = '${ioc.value}']`;
        case 'sha1':
            return `[file:hashes.'SHA-1' = '${ioc.value}']`;
        case 'sha256':
            return `[file:hashes.'SHA-256' = '${ioc.value}']`;
        default:
            return `[artifact:payload_bin = '${ioc.value}']`;
    }
};

/**
 * Convert severity to STIX threat level (TLP marking)
 */
const severityToTlp = (severity) => {
    switch (severity) {
        case 'critical':
        case 'high':
            return 'marking-definition--5e57c739-391a-4eb3-b6be-7d15ca92d5ed'; // TLP:RED
        case 'medium':
            return 'marking-definition--f88d31f6-486f-44da-b317-01333bde0b82'; // TLP:AMBER
        case 'low':
            return 'marking-definition--34098fce-860f-48ae-8e50-ebd3cc5e41da'; // TLP:GREEN
        default:
            return 'marking-definition--613f2e26-407d-48c7-9eca-b8e91df99dc9'; // TLP:WHITE/CLEAR
    }
};

/**
 * Convert IOC to STIX 2.1 Indicator object
 */
const iocToStixIndicator = (ioc) => {
    const now = new Date().toISOString();
    const id = `indicator--${ioc._id || crypto.randomUUID()}`;
    
    return {
        type: 'indicator',
        spec_version: '2.1',
        id: id,
        created: ioc.created_at ? new Date(ioc.created_at).toISOString() : now,
        modified: ioc.updated_at ? new Date(ioc.updated_at).toISOString() : now,
        name: `${ioc.type.toUpperCase()}: ${ioc.value.substring(0, 50)}${ioc.value.length > 50 ? '...' : ''}`,
        description: `Threat indicator of type ${ioc.type} with severity ${ioc.severity} and score ${ioc.score}`,
        indicator_types: getIndicatorTypes(ioc),
        pattern: iocToStixPattern(ioc),
        pattern_type: 'stix',
        valid_from: ioc.first_seen ? new Date(ioc.first_seen).toISOString() : now,
        valid_until: getValidUntil(ioc),
        confidence: Math.min(ioc.score, 100),
        labels: ioc.tags || [],
        object_marking_refs: [severityToTlp(ioc.severity)],
        external_references: getExternalReferences(ioc),
        custom_properties: {
            'x_cti_score': ioc.score,
            'x_cti_severity': ioc.severity,
            'x_cti_sources': ioc.sources?.map(s => s.name) || [],
        }
    };
};

/**
 * Get STIX indicator types based on IOC data
 */
const getIndicatorTypes = (ioc) => {
    const types = [];
    const tags = (ioc.tags || []).map(t => t.toLowerCase());
    
    if (tags.some(t => t.includes('malware') || t.includes('trojan') || t.includes('virus'))) {
        types.push('malicious-activity');
    }
    if (tags.some(t => t.includes('phishing'))) {
        types.push('phishing');
    }
    if (tags.some(t => t.includes('botnet') || t.includes('c2') || t.includes('c&c'))) {
        types.push('botnet');
    }
    if (tags.some(t => t.includes('ransomware'))) {
        types.push('malicious-activity');
    }
    if (ioc.severity === 'critical' || ioc.severity === 'high') {
        types.push('anomalous-activity');
    }
    
    // Default type if none matched
    if (types.length === 0) {
        types.push('unknown');
    }
    
    return [...new Set(types)]; // Remove duplicates
};

/**
 * Calculate valid_until date (90 days from last_seen or 1 year from now)
 */
const getValidUntil = (ioc) => {
    if (ioc.last_seen) {
        const validUntil = new Date(ioc.last_seen);
        validUntil.setDate(validUntil.getDate() + 90);
        return validUntil.toISOString();
    }
    const oneYear = new Date();
    oneYear.setFullYear(oneYear.getFullYear() + 1);
    return oneYear.toISOString();
};

/**
 * Get external references for STIX object
 */
const getExternalReferences = (ioc) => {
    const refs = [];
    
    // Add VirusTotal reference if available
    if (ioc.vt && ioc.vt.positives !== undefined) {
        refs.push({
            source_name: 'VirusTotal',
            description: `${ioc.vt.positives}/${ioc.vt.total || 0} detections`,
            url: `https://www.virustotal.com/gui/search/${encodeURIComponent(ioc.value)}`
        });
    }
    
    // Add AbuseIPDB reference if available
    if (ioc.abuseipdb && ioc.abuseipdb.abuse_confidence !== undefined) {
        refs.push({
            source_name: 'AbuseIPDB',
            description: `Confidence score: ${ioc.abuseipdb.abuse_confidence}%`,
            url: `https://www.abuseipdb.com/check/${encodeURIComponent(ioc.value)}`
        });
    }
    
    // Add source references
    if (ioc.sources) {
        ioc.sources.forEach(source => {
            if (source.name === 'urlhaus') {
                refs.push({
                    source_name: 'URLhaus',
                    description: source.ref || 'URLhaus threat feed',
                    url: 'https://urlhaus.abuse.ch/'
                });
            }
        });
    }
    
    return refs;
};

/**
 * Generate STIX 2.1 Bundle
 */
const generateStixBundle = (iocs) => {
    const indicators = iocs.map(ioc => iocToStixIndicator(ioc));
    
    return {
        type: 'bundle',
        id: `bundle--${crypto.randomUUID()}`,
        objects: [
            // Add identity for the CTI Dashboard
            {
                type: 'identity',
                spec_version: '2.1',
                id: 'identity--cti-dashboard',
                created: new Date().toISOString(),
                modified: new Date().toISOString(),
                name: 'CTI Dashboard',
                identity_class: 'system',
                description: 'Cyber Threat Intelligence Dashboard - Automated threat feed aggregator'
            },
            // Add TLP marking definitions
            {
                type: 'marking-definition',
                spec_version: '2.1',
                id: 'marking-definition--613f2e26-407d-48c7-9eca-b8e91df99dc9',
                created: '2017-01-20T00:00:00.000Z',
                definition_type: 'tlp',
                name: 'TLP:CLEAR',
                definition: { tlp: 'clear' }
            },
            ...indicators
        ]
    };
};

/**
 * Create and process export synchronously, returning file data directly
 */
const createExport = async (exportBody, user) => {
    const { format = 'json', filters = {} } = exportBody;

    // Validate format
    if (!['csv', 'json', 'stix'].includes(format)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid format. Supported: csv, json, stix');
    }

    // Build query from filters
    const query = {};
    
    // Type filter
    if (filters.type) query.type = filters.type;
    
    // Severity filter
    if (filters.severity) query.severity = filters.severity;
    
    // Tags filter
    if (filters.tags) {
        const tagList = typeof filters.tags === 'string' 
            ? filters.tags.split(',').map(t => t.trim()).filter(Boolean)
            : filters.tags;
        if (tagList.length > 0) {
            query.tags = { $in: tagList };
        }
    }
    
    // Score filters
    if (filters.score_min || filters.score_max) {
        query.score = {};
        if (filters.score_min) query.score.$gte = parseInt(filters.score_min, 10);
        if (filters.score_max) query.score.$lte = parseInt(filters.score_max, 10);
    }
    
    // Date filters
    if (filters.from || filters.to || filters.date_from || filters.date_to) {
        query.last_seen = {};
        const fromDate = filters.from || filters.date_from;
        const toDate = filters.to || filters.date_to;
        if (fromDate) query.last_seen.$gte = new Date(fromDate);
        if (toDate) {
            const to = new Date(toDate);
            to.setDate(to.getDate() + 1);
            query.last_seen.$lte = to;
        }
    }
    
    // Search filter
    if (filters.q || filters.search) {
        query.value = { $regex: filters.q || filters.search, $options: 'i' };
    }

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const extension = format === 'stix' ? 'json' : format;
    const filename = `cti_export_${timestamp}.${extension}`;

    // Fetch IOCs (limit to prevent memory issues)
    const maxRecords = 10000;
    const iocs = await Indicator.find(query).limit(maxRecords).lean();

    if (iocs.length === 0) {
        throw new ApiError(httpStatus.NOT_FOUND, 'No IOCs found matching the filters');
    }

    // Generate file data based on format
    let fileData;
    let contentType;

    if (format === 'json') {
        // Clean JSON export
        const cleanIocs = iocs.map(ioc => ({
            id: ioc._id,
            type: ioc.type,
            value: ioc.value,
            score: ioc.score,
            severity: ioc.severity,
            tags: ioc.tags || [],
            sources: (ioc.sources || []).map(s => ({ name: s.name, ref: s.ref })),
            first_seen: ioc.first_seen,
            last_seen: ioc.last_seen,
            vt: ioc.vt ? {
                positives: ioc.vt.positives,
                total: ioc.vt.total,
            } : null,
            abuseipdb: ioc.abuseipdb ? {
                abuse_confidence: ioc.abuseipdb.abuse_confidence,
                total_reports: ioc.abuseipdb.total_reports,
            } : null,
        }));
        fileData = JSON.stringify(cleanIocs, null, 2);
        contentType = 'application/json';
        
    } else if (format === 'csv') {
        const fields = [
            { label: 'Type', value: 'type' },
            { label: 'Value', value: 'value' },
            { label: 'Score', value: 'score' },
            { label: 'Severity', value: 'severity' },
            { label: 'Tags', value: (row) => (row.tags || []).join('; ') },
            { label: 'Sources', value: (row) => (row.sources || []).map(s => s.name).join('; ') },
            { label: 'First Seen', value: (row) => row.first_seen ? new Date(row.first_seen).toISOString() : '' },
            { label: 'Last Seen', value: (row) => row.last_seen ? new Date(row.last_seen).toISOString() : '' },
            { label: 'VT Positives', value: (row) => row.vt?.positives ?? '' },
            { label: 'VT Total', value: (row) => row.vt?.total ?? '' },
            { label: 'AbuseIPDB Confidence', value: (row) => row.abuseipdb?.abuse_confidence ?? '' },
        ];
        const parser = new Parser({ fields });
        fileData = parser.parse(iocs);
        contentType = 'text/csv';
        
    } else if (format === 'stix') {
        const stixBundle = generateStixBundle(iocs);
        fileData = JSON.stringify(stixBundle, null, 2);
        contentType = 'application/json';
    }

    // Log the export (optional - for audit purposes)
    try {
        await Export.create({
            format,
            query,
            created_by: user.id,
            status: 'completed',
            row_count: iocs.length,
            finished_at: new Date(),
        });
    } catch (err) {
        logger.warn(`Failed to log export: ${err.message}`);
    }

    return {
        filename,
        contentType,
        data: fileData,
        record_count: iocs.length,
    };
};

const queryExports = async (filter, options) => {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const exports = await Export.find(filter).sort({ created_at: -1 }).skip(skip).limit(limit);
    const total = await Export.countDocuments(filter);

    return {
        exports,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
        },
    };
};

const getExportById = async (id) => {
    const exportDoc = await Export.findById(id);
    if (!exportDoc) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Export not found');
    }
    return exportDoc;
};

const getExportFile = async (id) => {
    const exportDoc = await Export.findById(id);
    if (!exportDoc) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Export not found');
    }

    // Fetch raw document to get file_data which might not be in schema
    const rawDoc = await Export.collection.findOne({ _id: exportDoc._id });

    if (!rawDoc.file_data) {
        throw new ApiError(httpStatus.NOT_FOUND, 'File data not found');
    }

    return {
        filename: rawDoc.filename,
        format: exportDoc.format,
        data: rawDoc.file_data,
    };
};

const deleteExport = async (id) => {
    const exportDoc = await getExportById(id);
    await exportDoc.deleteOne();
    return exportDoc;
};

module.exports = {
    createExport,
    queryExports,
    getExportById,
    getExportFile,
    deleteExport,
};
