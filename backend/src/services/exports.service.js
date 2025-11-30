const httpStatus = require('http-status').default;
const crypto = require('crypto');
const { Parser } = require('json2csv');
const Export = require('../models/export.model');
const Indicator = require('../models/indicator.model');
const { ApiError } = require('../middleware/error');
const logger = require('../config/logger');

const createExport = async (exportBody, user) => {
    const { format = 'json', filters = {} } = exportBody;

    // Build query
    const query = {};
    if (filters.type) query.type = filters.type;
    if (filters.severity) query.severity = filters.severity;
    if (filters.tags && filters.tags.length > 0) query.tags = { $in: filters.tags };
    if (filters.score_min) query.score = { ...query.score, $gte: filters.score_min };
    if (filters.score_max) query.score = { ...query.score, $lte: filters.score_max };
    if (filters.date_from) query.created_at = { ...query.created_at, $gte: new Date(filters.date_from) };
    if (filters.date_to) query.created_at = { ...query.created_at, $lte: new Date(filters.date_to) };

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const exportId = crypto.randomUUID().substring(0, 8);
    const filename = `cti_export_${timestamp}_${exportId}.${format}`;

    const exportDoc = await Export.create({
        format,
        query,
        created_by: user.id,
        status: 'processing',
        filename, // We should add filename to model if not present, or just use it in processing
    });

    // Process asynchronously
    processExport(exportDoc._id, format, query, filename).catch(err => {
        logger.error(`Export processing failed: ${err}`);
    });

    return {
        id: exportDoc._id,
        filename,
        status: 'processing',
        message: 'Export started successfully',
    };
};

const processExport = async (exportId, format, query, filename) => {
    try {
        const iocs = await Indicator.find(query).lean();

        if (iocs.length === 0) {
            await Export.findByIdAndUpdate(exportId, {
                status: 'completed',
                record_count: 0,
                finished_at: new Date(),
            });
            return;
        }

        let fileData;
        if (format === 'json') {
            fileData = JSON.stringify(iocs, null, 2);
        } else if (format === 'csv') {
            const fields = ['type', 'value', 'severity', 'score', 'tags', 'created_at', 'updated_at'];
            const parser = new Parser({ fields });
            fileData = parser.parse(iocs);
        }

        // In a real app, we would upload this to S3 or write to disk.
        // For now, we'll store it in the database as a Buffer (not ideal for large files but matches Flask impl logic somewhat)
        // Actually Flask impl stores it in DB.
        // I need to update Export model to support file_data if I want to match exactly, or write to disk.
        // Flask impl: `exports_collection.update_one(..., {'$set': {..., 'file_data': file_data}})`
        // My Mongoose model `export.model.js` does NOT have `file_data`.
        // I should add `file_data` to the schema or just use `mixed` or add it dynamically.
        // I'll add it dynamically for now since Mongoose is flexible enough if strict is false, but strict is true by default.
        // I'll update the model later if needed, but for now I'll just assume I can save it or I'll modify the model.
        // Wait, I created `export.model.js` and it has `file_url`.
        // Flask impl sets `file_data` in DB.
        // I'll use `file_url` to point to a download endpoint that serves the data.
        // But where is the data stored?
        // I'll store it in a `file_data` field in the document. Mongoose will strip it if not in schema.
        // I should update `src/models/export.model.js` to include `file_data` and `filename`.

        await Export.findByIdAndUpdate(exportId, {
            status: 'completed',
            record_count: iocs.length,
            finished_at: new Date(),
            file_url: `/api/exports/${exportId}/download`,
            // We need to store data somewhere.
            // I'll add `file_data` to the update, but I need to update the model first or use `findOneAndUpdate` with bypass?
            // No, I should update the model.
        });

        // Direct update to bypass schema if needed, or better, update schema.
        // I'll update the schema in a separate step or just use `Export.collection.updateOne` to bypass Mongoose schema validation.
        await Export.collection.updateOne(
            { _id: exportId },
            { $set: { file_data: fileData, filename: filename } }
        );

    } catch (error) {
        await Export.findByIdAndUpdate(exportId, {
            status: 'error',
            error: error.message,
            finished_at: new Date(),
        });
        throw error;
    }
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
