const httpStatus = require('http-status').default;
const catchAsync = require('../utils/catchAsync');
const exportsService = require('../services/exports.service');

const createExport = catchAsync(async (req, res) => {
    const result = await exportsService.createExport(req.body, req.user);
    
    // Return file directly for download
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('X-Record-Count', result.record_count);
    res.send(result.data);
});

const listExports = catchAsync(async (req, res) => {
    const filter = { created_by: req.user.id };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.format) filter.format = req.query.format;

    const options = {
        page: req.query.page,
        limit: req.query.limit,
    };

    const result = await exportsService.queryExports(filter, options);
    res.send(result);
});

const getExport = catchAsync(async (req, res) => {
    const exportDoc = await exportsService.getExportById(req.params.exportId);
    if (exportDoc.created_by !== req.user.id) {
        res.status(httpStatus.FORBIDDEN).send({ error: 'Access denied' });
        return;
    }
    res.send(exportDoc);
});

const downloadExport = catchAsync(async (req, res) => {
    const exportDoc = await exportsService.getExportById(req.params.exportId);
    if (exportDoc.created_by !== req.user.id) {
        res.status(httpStatus.FORBIDDEN).send({ error: 'Access denied' });
        return;
    }

    if (exportDoc.status !== 'completed') {
        res.status(httpStatus.BAD_REQUEST).send({ error: 'Export is not ready for download' });
        return;
    }

    const file = await exportsService.getExportFile(req.params.exportId);

    // Set content type based on format
    let contentType;
    switch (file.format) {
        case 'json':
        case 'stix':
            contentType = 'application/json';
            break;
        case 'csv':
            contentType = 'text/csv';
            break;
        default:
            contentType = 'application/octet-stream';
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.send(file.data);
});

const deleteExport = catchAsync(async (req, res) => {
    const exportDoc = await exportsService.getExportById(req.params.exportId);
    if (exportDoc.created_by !== req.user.id) {
        res.status(httpStatus.FORBIDDEN).send({ error: 'Access denied' });
        return;
    }
    await exportsService.deleteExport(req.params.exportId);
    res.send({ message: 'Export deleted successfully' });
});

module.exports = {
    createExport,
    listExports,
    getExport,
    downloadExport,
    deleteExport,
};
