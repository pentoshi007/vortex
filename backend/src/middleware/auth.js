const jwt = require('jsonwebtoken');
const httpStatus = require('http-status').default;
const config = require('../config/config');
const { ApiError } = require('./error');
const User = require('../models/user.model');

const auth = (requiredRights) => async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
        }

        const token = authHeader.split(' ')[1];

        // Verify token
        const payload = jwt.verify(token, config.jwt.secret);

        // Check if user exists
        const user = await User.findById(payload.sub);
        if (!user) {
            throw new ApiError(httpStatus.UNAUTHORIZED, 'User not found');
        }

        // Check permissions if requiredRights provided
        if (requiredRights) {
            const userRights = {
                admin: ['read', 'write', 'tag', 'export', 'lookup', 'admin'],
                analyst: ['read', 'tag', 'export', 'lookup'],
                viewer: ['read', 'tag', 'lookup'],
            };

            const hasRights = requiredRights.every((right) => {
                return userRights[user.role] && userRights[user.role].includes(right);
            });

            if (!hasRights) {
                throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
            }
        }

        req.user = user;
        next();
    } catch (error) {
        next(new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate'));
    }
};

module.exports = auth;
