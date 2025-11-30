const jwt = require('jsonwebtoken');
const moment = require('moment');
const config = require('../config/config');

const generateToken = (userId, expires, type, secret = config.jwt.secret) => {
    const payload = {
        sub: userId,
        iat: moment().unix(),
        exp: expires.unix(),
        type,
    };
    return jwt.sign(payload, secret);
};

const generateAuthTokens = async (user) => {
    const accessTokenExpires = moment().add(config.jwt.accessExpirationMinutes, 'minutes');
    const accessToken = generateToken(user.id, accessTokenExpires, 'access');

    const refreshTokenExpires = moment().add(config.jwt.refreshExpirationDays, 'days');
    const refreshToken = generateToken(user.id, refreshTokenExpires, 'refresh');

    return {
        access: {
            token: accessToken,
            expires: accessTokenExpires.toDate(),
        },
        refresh: {
            token: refreshToken,
            expires: refreshTokenExpires.toDate(),
        },
    };
};

const verifyToken = async (token, type) => {
    const payload = jwt.verify(token, config.jwt.secret);
    if (payload.type !== type) {
        throw new Error('Token type invalid');
    }
    return payload;
};

module.exports = {
    generateToken,
    generateAuthTokens,
    verifyToken,
};
