const httpStatus = require('http-status').default;
const catchAsync = require('../utils/catchAsync');
const authService = require('../services/auth.service');
const tokenService = require('../services/token.service');

const register = catchAsync(async (req, res) => {
    const user = await authService.register(req.body);
    const tokens = await tokenService.generateAuthTokens(user);
    res.status(httpStatus.CREATED).send({
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            permissions: ['read', 'tag', 'lookup'], // Simplified, should come from user model logic
            created_at: user.created_at,
            last_login: user.last_login,
        },
        access_token: tokens.access.token,
        refresh_token: tokens.refresh.token,
    });
});

const login = catchAsync(async (req, res) => {
    const { username, password } = req.body;
    const user = await authService.login(username, password);
    const tokens = await tokenService.generateAuthTokens(user);
    res.send({
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            permissions: ['read', 'tag', 'lookup'], // Simplified
            created_at: user.created_at,
            last_login: user.last_login,
        },
        access_token: tokens.access.token,
        refresh_token: tokens.refresh.token,
    });
});

const refresh = catchAsync(async (req, res) => {
    const authHeader = req.headers.authorization;
    const refreshToken = authHeader && authHeader.split(' ')[1];

    if (!refreshToken) {
        return res.status(httpStatus.UNAUTHORIZED).send({ message: 'Refresh token required' });
    }

    const { tokens, user } = await authService.refreshAuth(refreshToken);
    res.send({
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            permissions: user.role === 'admin' 
                ? ['admin', 'read', 'write', 'delete', 'tag', 'lookup', 'export']
                : user.role === 'analyst'
                ? ['read', 'write', 'tag', 'lookup', 'export']
                : ['read', 'tag', 'lookup'],
            created_at: user.created_at,
            last_login: user.last_login,
        },
        access_token: tokens.access.token,
        refresh_token: tokens.refresh.token,
    });
});

const logout = catchAsync(async (req, res) => {
    // Stateless logout
    res.status(httpStatus.OK).send({ message: 'Logged out successfully' });
});

module.exports = {
    register,
    login,
    refresh,
    logout,
};
