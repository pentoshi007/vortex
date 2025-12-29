const cron = require('node-cron');
const logger = require('../config/logger');
const ingestionService = require('../services/ingestion.service');
const lookupService = require('../services/lookup.service');
const iocsService = require('../services/iocs.service');
const rateLimiter = require('../utils/rateLimiter');

// Track if jobs are running to prevent overlap
let isIngestionRunning = false;
let isEnrichmentRunning = false;
let isCleanupRunning = false;

const initCronJobs = () => {
    // URLHaus Ingestion - Every 2 hours (reduced frequency for stability)
    cron.schedule('0 */2 * * *', async () => {
        if (isIngestionRunning) {
            logger.warn('Skipping scheduled ingestion - previous run still in progress');
            return;
        }
        
        isIngestionRunning = true;
        logger.info('Running scheduled task: URLHaus Ingestion');
        
        try {
            const result = await ingestionService.fetchAndIngest('cron');
            logger.info(`Scheduled URLHaus ingestion completed: ${result.new_count} new, ${result.updated_count} updated`);
        } catch (error) {
            logger.error(`Scheduled URLHaus ingestion failed: ${error.message}`);
        } finally {
            isIngestionRunning = false;
        }
    });

    // Bulk Enrichment - Every 2 hours, offset by 30 minutes from ingestion
    // Limited to 10 IOCs per run to stay within free tier limits
    // VT: 4/min, 500/day => ~10 enrichments per 2-hour window is safe
    cron.schedule('30 */2 * * *', async () => {
        if (isEnrichmentRunning) {
            logger.warn('Skipping scheduled enrichment - previous run still in progress');
            return;
        }
        
        // Check rate limits before starting
        const rateLimitStatus = rateLimiter.getRateLimitStatus();
        if (rateLimitStatus.virustotal.dailyRemaining < 10) {
            logger.warn(`Skipping scheduled enrichment - VT daily limit low (${rateLimitStatus.virustotal.dailyRemaining} remaining)`);
            return;
        }
        
        isEnrichmentRunning = true;
        logger.info('Running scheduled task: Bulk Enrichment');
        
        try {
            // Process max 10 IOCs per run to stay within free tier limits
            const result = await lookupService.bulkEnrichRecentIocs(10);
            logger.info(`Scheduled bulk enrichment completed: ${result.enriched_count} enriched, ${result.error_count} errors`);
        } catch (error) {
            logger.error(`Scheduled bulk enrichment failed: ${error.message}`);
        } finally {
            isEnrichmentRunning = false;
        }
    });

    // Cleanup old IOCs - Daily at 3:00 AM
    // Deletes IOCs that haven't been seen in 30 days
    cron.schedule('0 3 * * *', async () => {
        if (isCleanupRunning) {
            logger.warn('Skipping scheduled cleanup - previous run still in progress');
            return;
        }
        
        isCleanupRunning = true;
        logger.info('Running scheduled task: Cleanup old IOCs (older than 30 days)');
        
        try {
            const result = await iocsService.deleteOldIocs(30);
            logger.info(`Scheduled cleanup completed: ${result.deleted_count} IOCs deleted (cutoff: ${result.cutoff_date.toISOString()})`);
        } catch (error) {
            logger.error(`Scheduled cleanup failed: ${error.message}`);
        } finally {
            isCleanupRunning = false;
        }
    });

    // Log rate limit status every 6 hours for monitoring
    cron.schedule('0 */6 * * *', () => {
        const status = rateLimiter.getRateLimitStatus();
        logger.info(`Rate limit status - VT: ${status.virustotal.dailyRemaining}/${status.virustotal.dailyRemaining + rateLimiter.getRateLimitStatus().virustotal.dailyRemaining} daily, AbuseIPDB: ${status.abuseipdb.dailyRemaining} daily`);
    });

    logger.info('Cron jobs initialized (2-hour interval for free tier compatibility, daily cleanup at 3 AM)');
};

module.exports = initCronJobs;
