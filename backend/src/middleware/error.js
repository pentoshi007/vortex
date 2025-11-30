const mongoose = require('mongoose');
const httpStatus = require('http-status').default;
const config = require('../config/config');
const logger = require('../config/logger');

class ApiError extends Error {
    constructor(statusCode, message, isOperational = true, stack = '') {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

const errorConverter = (err, req, res, next) => {
    let error = err;
    if (!(error instanceof ApiError)) {
        const statusCode =
            error.statusCode || (error instanceof mongoose.Error ? httpStatus.BAD_REQUEST : httpStatus.INTERNAL_SERVER_ERROR);
        const message = error.message || httpStatus[statusCode];
        error = new ApiError(statusCode, message, false, err.stack);
    }
    next(error);
};

const errorHandler = (err, req, res, next) => {
    let { statusCode, message } = err;
    if (config.env === 'production' && !err.isOperational) {
        statusCode = 500;
        message = 'Internal Server Error';
    }

    // Fallback if statusCode is still undefined
    if (!statusCode) {
        statusCode = 500;
        message = message || 'Internal Server Error';
    }

    res.locals.errorMessage = err.message;

    const response = {
        code: statusCode,
        message,
        ...(config.env === 'development' && { stack: err.stack }),
    };

    if (config.env === 'development') {
        logger.error(err);
    }

    res.status(statusCode).send(response);
};

module.exports = {
    ApiError,
    errorConverter,
    errorHandler,
};
