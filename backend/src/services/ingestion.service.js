const axios = require('axios');
const csv = require('csv-parser');
const { Readable } = require('stream');
const Indicator = require('../models/indicator.model');
const EnrichmentRun = require('../models/enrichment_run.model');
const logger = require('../config/logger');
const config = require('../config/config');

const URLHAUS_FEED_URL = config.external?.urlHausFeedUrl || 'https://urlhaus.abuse.ch/downloads/csv_recent/';

// Max execution time for serverless environments (55 seconds to be safe)
const MAX_EXECUTION_TIME = config.isServerless ? 55000 : 300000; // 55s for serverless, 5min for traditional

const fetchAndIngest = async (source = 'urlhaus') => {
    const startTime = new Date();
    let fetchedCount = 0;
    let newCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    let stoppedEarly = false;

    try {
        logger.info(`Starting URLHaus ingestion (max execution: ${MAX_EXECUTION_TIME}ms)...`);
        
        const response = await axios.get(URLHAUS_FEED_URL, { 
            responseType: 'stream',
            timeout: 30000, // 30 second timeout for initial connection
            headers: {
                'User-Agent': 'CTI-Dashboard/1.0',
            },
        });

        const stream = response.data.pipe(csv({ headers: false, skipLines: 9 })); // URLHaus CSV has comments at top

        // Batch operations for better performance
        const batchSize = 50;
        let batch = [];

        for await (const row of stream) {
            // Check execution time limit (important for serverless)
            const elapsed = Date.now() - startTime.getTime();
            if (elapsed >= MAX_EXECUTION_TIME) {
                logger.warn(`Execution time limit reached (${elapsed}ms), stopping ingestion early`);
                stoppedEarly = true;
                break;
            }

            fetchedCount++;

            try {
                const url = row[2];
                const threat = row[5];
                const tags = row[6] ? row[6].split(',').map(t => t.trim()).filter(Boolean) : [];
                const reporter = row[8];
                const status = row[3];

                // Skip invalid or offline URLs
                if (!url || !url.startsWith('http') || status !== 'online') continue;

                batch.push({ url, threat, tags, reporter });

                // Process batch when full
                if (batch.length >= batchSize) {
                    const results = await processBatch(batch);
                    newCount += results.new;
                    updatedCount += results.updated;
                    errorCount += results.errors;
                    batch = [];
                }
            } catch (err) {
                errorCount++;
                if (errorCount <= 5) {
                logger.error(`Error processing URLHaus row: ${err.message}`);
            }
            }

            // Limit total processed for safety (adjustable per environment)
            const maxRecords = config.isServerless ? 500 : 1000;
            if (fetchedCount >= maxRecords) {
                logger.info(`Reached max record limit (${maxRecords}), stopping`);
                break;
            }
        }

        // Process remaining batch
        if (batch.length > 0) {
            const results = await processBatch(batch);
            newCount += results.new;
            updatedCount += results.updated;
            errorCount += results.errors;
        }

        const duration = (new Date() - startTime) / 1000;

        // Record run with correct field names for frontend
        await EnrichmentRun.create({
            operation: 'ingestion',
            source: source || 'urlhaus',
            status: stoppedEarly ? 'completed' : 'completed', // Still mark as completed
            started_at: startTime,
            finished_at: new Date(),
            fetched_count: fetchedCount,
            new_count: newCount,
            updated_count: updatedCount,
            error_count: errorCount,
            duration_seconds: duration,
        });

        logger.info(`URLHaus ingestion completed. Fetched: ${fetchedCount}, New: ${newCount}, Updated: ${updatedCount}, Errors: ${errorCount}, Duration: ${duration}s`);

        return {
            fetched_count: fetchedCount,
            new_count: newCount,
            updated_count: updatedCount,
            error_count: errorCount,
            duration_seconds: duration,
            stopped_early: stoppedEarly,
        };

    } catch (error) {
        const duration = (new Date() - startTime) / 1000;
        logger.error(`URLHaus ingestion failed: ${error.message}`);
        
        await EnrichmentRun.create({
            operation: 'ingestion',
            source: source || 'urlhaus',
            status: 'failed',
            started_at: startTime,
            finished_at: new Date(),
            fetched_count: fetchedCount,
            new_count: newCount,
            updated_count: updatedCount,
            error_count: errorCount,
            duration_seconds: duration,
            error: error.message,
        });
        
        throw error;
    }
};

/**
 * Process a batch of URLs efficiently using bulkWrite
 */
const processBatch = async (batch) => {
    let newCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    try {
        // Get existing URLs in one query
        const urls = batch.map(b => b.url);
        const existing = await Indicator.find({ type: 'url', value: { $in: urls } });
        const existingMap = new Map(existing.map(e => [e.value, e]));

        const bulkOps = [];

        for (const item of batch) {
            const existingIoc = existingMap.get(item.url);

            if (!existingIoc) {
                // Insert new
                bulkOps.push({
                    insertOne: {
                        document: {
                            type: 'url',
                            value: item.url,
                            severity: mapThreatToSeverity(item.threat),
                            score: 75,
                            tags: ['urlhaus', ...item.tags],
                            sources: [{
                                name: 'urlhaus',
                                ref: `Reporter: ${item.reporter}`,
                                first_seen: new Date(),
                                last_seen: new Date(),
                            }],
                            first_seen: new Date(),
                            last_seen: new Date(),
                        }
                    }
                });
                newCount++;
            } else {
                // Update existing
                const updateTags = existingIoc.tags.includes('urlhaus') 
                    ? existingIoc.tags 
                    : [...existingIoc.tags, 'urlhaus'];

                bulkOps.push({
                    updateOne: {
                        filter: { _id: existingIoc._id },
                        update: {
                            $set: {
                                tags: updateTags,
                                last_seen: new Date(),
                            }
                        }
                    }
                });
                updatedCount++;
            }
        }

        if (bulkOps.length > 0) {
            await Indicator.bulkWrite(bulkOps, { ordered: false });
        }
    } catch (err) {
        logger.error(`Batch processing error: ${err.message}`);
        errorCount = batch.length;
    }

    return { new: newCount, updated: updatedCount, errors: errorCount };
};

const mapThreatToSeverity = (threat) => {
    if (!threat) return 'medium';
    threat = threat.toLowerCase();
    if (threat.includes('malware') || threat.includes('trojan') || threat.includes('ransomware')) return 'critical';
    if (threat.includes('phishing')) return 'high';
    return 'medium';
};

module.exports = {
    fetchAndIngest,
};
