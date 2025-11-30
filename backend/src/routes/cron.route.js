/**
 * Serverless Cron Routes
 * 
 * These endpoints are designed to be called by:
 * 1. Vercel Cron (via vercel.json configuration)
 * 2. External schedulers (like cron-job.org)
 * 3. GitHub Actions scheduled workflows
 * 
 * Authentication: Uses CRON_SECRET environment variable
 */

const express = require('express');
const logger = require('../config/logger');
const ingestionService = require('../services/ingestion.service');
const lookupService = require('../services/lookup.service');
const rateLimiter = require('../utils/rateLimiter');

const router = express.Router();

/**
 * Middleware to verify cron secret
 * Supports both Authorization header and query parameter
 */
const verifyCronSecret = (req, res, next) => {
    const cronSecret = process.env.CRON_SECRET;
    
    // If no secret is configured, allow in development only
    if (!cronSecret) {
        if (process.env.NODE_ENV === 'development') {
            logger.warn('CRON_SECRET not set, allowing request in development mode');
            return next();
        }
        return res.status(500).json({ error: 'CRON_SECRET not configured' });
    }

    // Check Authorization header (Vercel Cron uses this)
    const authHeader = req.headers.authorization;
    if (authHeader === `Bearer ${cronSecret}`) {
        return next();
    }

    // Check query parameter (for external schedulers)
    if (req.query.secret === cronSecret) {
        return next();
    }

    logger.warn('Unauthorized cron request attempted');
    return res.status(401).json({ error: 'Unauthorized' });
};

// URLHaus Ingestion Cron Job
// Recommended: Run every 2 hours
// Vercel Cron schedule: "0 */2 * * *" (every 2 hours)
router.get('/ingest', verifyCronSecret, async (req, res) => {
    const startTime = Date.now();
    
    try {
        logger.info('Cron: Starting URLHaus ingestion');
        
        const result = await ingestionService.fetchAndIngest('cron');
        
        const duration = (Date.now() - startTime) / 1000;
        logger.info(`Cron: URLHaus ingestion completed in ${duration}s`);
        
        res.json({
            success: true,
            message: 'Ingestion completed',
            result,
            duration_seconds: duration,
        });
    } catch (error) {
        const duration = (Date.now() - startTime) / 1000;
        logger.error(`Cron: URLHaus ingestion failed: ${error.message}`);
        
        res.status(500).json({
            success: false,
            error: error.message,
            duration_seconds: duration,
        });
    }
});

// Bulk Enrichment Cron Job
// Recommended: Run every 2 hours (respects free tier limits)
// Vercel Cron schedule: "30 */2 * * *" (every 2 hours, offset by 30 min)
// Query params: limit - Max IOCs to process (default: 10 for free tier)
router.get('/enrich', verifyCronSecret, async (req, res) => {
    const startTime = Date.now();
    const limit = parseInt(req.query.limit) || 10;
    
    try {
        logger.info(`Cron: Starting bulk enrichment (limit: ${limit})`);
        
        // Get rate limit status before starting
        const rateLimitStatus = rateLimiter.getRateLimitStatus();
        
        // Check if we have enough API quota
        if (rateLimitStatus.virustotal.dailyRemaining < 5) {
            logger.warn('Cron: VirusTotal daily limit nearly exhausted, skipping enrichment');
            return res.json({
                success: true,
                message: 'Skipped - VirusTotal daily limit nearly exhausted',
                rate_limit_status: rateLimitStatus,
            });
        }
        
        const result = await lookupService.bulkEnrichRecentIocs(limit);
        
        const duration = (Date.now() - startTime) / 1000;
        logger.info(`Cron: Bulk enrichment completed in ${duration}s`);
        
        res.json({
            success: true,
            message: 'Enrichment completed',
            result,
            duration_seconds: duration,
        });
    } catch (error) {
        const duration = (Date.now() - startTime) / 1000;
        logger.error(`Cron: Bulk enrichment failed: ${error.message}`);
        
        res.status(500).json({
            success: false,
            error: error.message,
            duration_seconds: duration,
        });
    }
});

/**
 * Rate Limit Status Endpoint
 * Check current rate limit status for external APIs
 */
router.get('/status', verifyCronSecret, async (req, res) => {
    const rateLimitStatus = rateLimiter.getRateLimitStatus();
    
    res.json({
        success: true,
        rate_limits: rateLimitStatus,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Health check for cron system
 * Can be used by monitoring services
 */
router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'cron',
        timestamp: new Date().toISOString(),
    });
});

module.exports = router;

