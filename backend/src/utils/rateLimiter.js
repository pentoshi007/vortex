/**
 * Rate Limiter for External API Calls
 * 
 * Free tier limits (configurable via env vars):
 * - VirusTotal: 4 requests/minute, 500 requests/day
 * - AbuseIPDB: 1000 requests/day (~41/hour)
 */

const logger = require('../config/logger');
const config = require('../config/config');

// Get limits from config (with fallback to free tier defaults)
const vtLimits = config.external?.vtRateLimit || { perMinute: 4, perDay: 500 };
const abuseIpDbLimits = config.external?.abuseIpDbRateLimit || { perDay: 1000 };

// In-memory rate tracking (resets on server restart)
// For production with multiple instances, use Redis
const rateLimits = {
    virustotal: {
        minuteRequests: 0,
        minuteResetTime: Date.now() + 60000,
        dailyRequests: 0,
        dailyResetTime: Date.now() + 86400000,
        // Configurable limits (default to free tier)
        maxPerMinute: vtLimits.perMinute,
        maxPerDay: vtLimits.perDay,
    },
    abuseipdb: {
        dailyRequests: 0,
        dailyResetTime: Date.now() + 86400000,
        // Configurable limit (default to free tier)
        maxPerDay: abuseIpDbLimits.perDay,
    },
};

/**
 * Check if we can make a request to VirusTotal
 */
const canRequestVirusTotal = () => {
    const now = Date.now();
    const vt = rateLimits.virustotal;

    // Reset minute counter if needed
    if (now >= vt.minuteResetTime) {
        vt.minuteRequests = 0;
        vt.minuteResetTime = now + 60000;
    }

    // Reset daily counter if needed
    if (now >= vt.dailyResetTime) {
        vt.dailyRequests = 0;
        vt.dailyResetTime = now + 86400000;
    }

    return vt.minuteRequests < vt.maxPerMinute && vt.dailyRequests < vt.maxPerDay;
};

/**
 * Record a VirusTotal request
 */
const recordVirusTotalRequest = () => {
    rateLimits.virustotal.minuteRequests++;
    rateLimits.virustotal.dailyRequests++;
};

/**
 * Check if we can make a request to AbuseIPDB
 */
const canRequestAbuseIPDB = () => {
    const now = Date.now();
    const abuseipdb = rateLimits.abuseipdb;

    // Reset daily counter if needed
    if (now >= abuseipdb.dailyResetTime) {
        abuseipdb.dailyRequests = 0;
        abuseipdb.dailyResetTime = now + 86400000;
    }

    return abuseipdb.dailyRequests < abuseipdb.maxPerDay;
};

/**
 * Record an AbuseIPDB request
 */
const recordAbuseIPDBRequest = () => {
    rateLimits.abuseipdb.dailyRequests++;
};

/**
 * Get time to wait before next VirusTotal request (in ms)
 */
const getVirusTotalWaitTime = () => {
    const now = Date.now();
    const vt = rateLimits.virustotal;

    if (vt.dailyRequests >= vt.maxPerDay) {
        return vt.dailyResetTime - now;
    }

    if (vt.minuteRequests >= vt.maxPerMinute) {
        return vt.minuteResetTime - now;
    }

    return 0;
};

/**
 * Get current rate limit status for monitoring
 */
const getRateLimitStatus = () => {
    return {
        virustotal: {
            minuteRemaining: rateLimits.virustotal.maxPerMinute - rateLimits.virustotal.minuteRequests,
            dailyRemaining: rateLimits.virustotal.maxPerDay - rateLimits.virustotal.dailyRequests,
            minuteResetIn: Math.max(0, rateLimits.virustotal.minuteResetTime - Date.now()),
            dailyResetIn: Math.max(0, rateLimits.virustotal.dailyResetTime - Date.now()),
        },
        abuseipdb: {
            dailyRemaining: rateLimits.abuseipdb.maxPerDay - rateLimits.abuseipdb.dailyRequests,
            dailyResetIn: Math.max(0, rateLimits.abuseipdb.dailyResetTime - Date.now()),
        },
    };
};

/**
 * Wait for rate limit to reset (with timeout)
 * @param {string} service - 'virustotal' or 'abuseipdb'
 * @param {number} maxWait - Maximum time to wait in ms (default 60s)
 */
const waitForRateLimit = async (service, maxWait = 60000) => {
    if (service === 'virustotal') {
        const waitTime = getVirusTotalWaitTime();
        if (waitTime > 0 && waitTime <= maxWait) {
            logger.debug(`Waiting ${waitTime}ms for VirusTotal rate limit reset`);
            await new Promise(resolve => setTimeout(resolve, waitTime + 100));
            return true;
        }
        return waitTime === 0;
    }
    return true;
};

module.exports = {
    canRequestVirusTotal,
    recordVirusTotalRequest,
    canRequestAbuseIPDB,
    recordAbuseIPDBRequest,
    getVirusTotalWaitTime,
    getRateLimitStatus,
    waitForRateLimit,
};

