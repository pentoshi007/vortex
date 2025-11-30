const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

module.exports = {
    port: process.env.PORT || 8080,
    env: process.env.NODE_ENV || 'development',
    isServerless: !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.SERVERLESS),
    mongo: {
        uri: process.env.MONGO_URI,
        dbName: process.env.MONGO_DB || 'cti',
    },
    jwt: {
        // JWT_SECRET is required - no default for security
        secret: process.env.JWT_SECRET,
        accessExpirationMinutes: process.env.JWT_ACCESS_TTL ? parseInt(process.env.JWT_ACCESS_TTL) / 60 : 60,
        refreshExpirationDays: process.env.JWT_REFRESH_TTL ? parseInt(process.env.JWT_REFRESH_TTL) / 86400 : 30,
    },
    cors: {
        origins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3000'],
    },
    cron: {
        secret: process.env.CRON_SECRET,
    },
    external: {
        vtApiKey: process.env.VT_API_KEY,
        abuseIpDbApiKey: process.env.ABUSEIPDB_API_KEY,
        urlHausFeedUrl: 'https://urlhaus.abuse.ch/downloads/csv_recent/',
        // Free tier rate limits
        vtRateLimit: {
            perMinute: parseInt(process.env.VT_RATE_LIMIT_PER_MIN) || 4,
            perDay: parseInt(process.env.VT_RATE_LIMIT_PER_DAY) || 500,
        },
        abuseIpDbRateLimit: {
            perDay: parseInt(process.env.ABUSEIPDB_RATE_LIMIT_PER_DAY) || 1000,
        },
    },
    rateLimit: {
        lookupPerMin: parseInt(process.env.RATE_LIMIT_LOOKUP_PER_MIN) || 60,
    },
    exportDir: process.env.EXPORT_DIR || './exports',
};
