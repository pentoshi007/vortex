const httpStatus = require('http-status').default;
const tokenService = require('./token.service');
const User = require('../models/user.model');
const { ApiError } = require('../middleware/error');

const register = async (userBody) => {
    if (await User.findOne({ username: userBody.username })) {
        throw new ApiError(httpStatus.CONFLICT, 'Username already exists');
    }
    if (await User.findOne({ email: userBody.email })) {
        throw new ApiError(httpStatus.CONFLICT, 'Email already registered');
    }

    // Validate role
    if (userBody.role && !['admin', 'analyst', 'viewer'].includes(userBody.role)) {
        userBody.role = 'viewer';
    }

    // Hash password
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userBody.password, salt);

    const user = await User.create({
        ...userBody,
        password_hash: hashedPassword,
        last_login: new Date(),
    });

    return user;
};

const login = async (username, password) => {
    const user = await User.findOne({ username });
    if (!user || !(await user.isPasswordMatch(password))) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid credentials');
    }

    user.last_login = new Date();
    await user.save();

    return user;
};

const refreshAuth = async (refreshToken) => {
    try {
        const payload = await tokenService.verifyToken(refreshToken, 'refresh');
        const user = await User.findById(payload.sub);
        if (!user) {
            throw new Error();
        }
        const tokens = await tokenService.generateAuthTokens(user);
        return { tokens, user };
    } catch (error) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
    }
};

module.exports = {
    register,
    login,
    refreshAuth,
};
