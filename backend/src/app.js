const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const config = require('./config/config');
const logger = require('./config/logger');
const connectDB = require('./config/db');
const routes = require('./routes');
const { errorConverter, errorHandler } = require('./middleware/error');

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET', 'MONGO_URI'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
    logger.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    } else {
        logger.warn('Running in development mode with missing env vars - some features may not work');
    }
}

const app = express();

// Trust proxy - required for Vercel/serverless environments behind reverse proxies
// This allows express-rate-limit to correctly identify users via X-Forwarded-For header
app.set('trust proxy', 1);

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet());

// Enable CORS
app.use(cors({
    origin: config.cors.origins,
    credentials: true,
}));

// Logger middleware
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Parse JSON request body
app.use(express.json());

// Parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api', routes);

// Health check
app.get('/api/health', (req, res) => {
    res.send({ status: 'healthy', service: 'cti-dashboard-node' });
});

// Error handling
app.use(errorConverter);
app.use(errorHandler);

const port = config.port;

// Only start server if not in serverless environment
// Vercel sets VERCEL=1, AWS Lambda has AWS_LAMBDA_FUNCTION_NAME
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.SERVERLESS;

if (!isServerless) {
    app.listen(port, () => {
        logger.info(`Server running on port ${port}`);
    });

    // Initialize cron jobs only in non-serverless environment
    // In serverless (Vercel), use /api/cron/* endpoints with Vercel Cron
    const initCronJobs = require('./jobs/cron');
    initCronJobs();
    logger.info('Running in traditional server mode with local cron jobs');
} else {
    logger.info('Running in serverless mode - use /api/cron/* endpoints for scheduled tasks');
}

module.exports = app;
