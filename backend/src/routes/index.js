const express = require('express');
const authRoute = require('./auth.route');
const iocsRoute = require('./iocs.route');
const lookupRoute = require('./lookup.route');
const tagsRoute = require('./tags.route');
const metricsRoute = require('./metrics.route');
const exportsRoute = require('./exports.route');
const adminRoute = require('./admin.route');
const cronRoute = require('./cron.route');

const router = express.Router();

const defaultRoutes = [
    {
        path: '/auth',
        route: authRoute,
    },
    {
        path: '/iocs',
        route: iocsRoute,
    },
    {
        path: '/lookup',
        route: lookupRoute,
    },
    {
        path: '/tags',
        route: tagsRoute,
    },
    {
        path: '/metrics',
        route: metricsRoute,
    },
    {
        path: '/exports',
        route: exportsRoute,
    },
    {
        path: '/admin',
        route: adminRoute,
    },
    {
        path: '/cron',
        route: cronRoute,
    },
];

defaultRoutes.forEach((route) => {
    router.use(route.path, route.route);
});

module.exports = router;
