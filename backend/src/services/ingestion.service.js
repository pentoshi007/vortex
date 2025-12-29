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
 * Calculate initial score for a new IOC based on available data.
 * This mimics the model's calculateScore() method but is used for bulk inserts.
 * 
 * Score breakdown (max 100):
 * - Sources: 10 points per source, max 30 points
 * - Recency: 20 points if < 24h, 15 if < 7d, 10 if < 30d
 * - VirusTotal: up to 30 points based on detection ratio (not available at ingestion)
 * - AbuseIPDB: up to 20 points based on confidence score (not available at ingestion)
 * 
 * For new IOCs without enrichment, max score is ~30 (1 source + recent)
 */
const calculateInitialScore = (sources = [], lastSeen = new Date(), vt = null, abuseipdb = null) => {
    let score = 0;

    // Base score from number of sources (10 per source, max 30)
    const sourceScore = Math.min(sources.length * 10, 30);
    score += sourceScore;

    // Recency score
    if (lastSeen) {
        const hoursAgo = (Date.now() - lastSeen.getTime()) / (1000 * 60 * 60);
        if (hoursAgo < 24) score += 20;
        else if (hoursAgo < 168) score += 15;
        else if (hoursAgo < 720) score += 10;
    }

    // VirusTotal score (only if enrichment data is available)
    if (vt && vt.positives !== undefined && vt.total) {
        const vtRatio = vt.positives / vt.total;
        score += Math.floor(vtRatio * 30);
    }

    // AbuseIPDB score (only for IPs with enrichment data)
    if (abuseipdb && abuseipdb.abuse_confidence !== undefined) {
        const confidence = abuseipdb.abuse_confidence;
        if (confidence >= 90) score += 20;
        else if (confidence >= 75) score += 15;
        else if (confidence >= 50) score += 10;
        else if (confidence >= 25) score += 5;
        else if (confidence > 0) score += 2;
    }

    return Math.min(score, 100);
};

/**
 * Calculate severity based on score.
 * This matches the model's updateSeverity() method.
 */
const calculateSeverityFromScore = (score) => {
    if (score >= 85) return 'critical';
    if (score >= 70) return 'high';
    if (score >= 50) return 'medium';
    if (score >= 25) return 'low';
    return 'info';
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
            const now = new Date();

            if (!existingIoc) {
                // Insert new - calculate score based on available data
                const sources = [{
                    name: 'urlhaus',
                    ref: `Reporter: ${item.reporter}`,
                    first_seen: now,
                    last_seen: now,
                }];
                
                // Calculate proper initial score (will be ~30 for new IOCs: 10 from source + 20 from recency)
                const initialScore = calculateInitialScore(sources, now, null, null);
                const severity = calculateSeverityFromScore(initialScore);
                
                bulkOps.push({
                    insertOne: {
                        document: {
                            type: 'url',
                            value: item.url,
                            score: initialScore,
                            severity: severity,
                            tags: ['urlhaus', ...item.tags],
                            sources: sources,
                            first_seen: now,
                            last_seen: now,
                        }
                    }
                });
                newCount++;
            } else {
                // Update existing - recalculate score if sources change
                const hasUrlhausSource = existingIoc.sources.some(s => s.name === 'urlhaus');
                const updateTags = existingIoc.tags.includes('urlhaus') 
                    ? existingIoc.tags 
                    : [...existingIoc.tags, 'urlhaus'];

                // If this is a new source, add it and recalculate score
                let updateOp = {
                    $set: {
                        tags: updateTags,
                        last_seen: now,
                    }
                };

                if (!hasUrlhausSource) {
                    // Add new source and recalculate score
                    const newSources = [...existingIoc.sources, {
                        name: 'urlhaus',
                        ref: `Reporter: ${item.reporter}`,
                        first_seen: now,
                        last_seen: now,
                    }];
                    const newScore = calculateInitialScore(newSources, now, existingIoc.vt, existingIoc.abuseipdb);
                    const newSeverity = calculateSeverityFromScore(newScore);
                    
                    updateOp = {
                        $set: {
                            tags: updateTags,
                            last_seen: now,
                            sources: newSources,
                            score: newScore,
                            severity: newSeverity,
                        }
                    };
                } else {
                    // Update last_seen on existing urlhaus source
                    const updatedSources = existingIoc.sources.map(s => {
                        if (s.name === 'urlhaus') {
                            return { ...s, last_seen: now };
                        }
                        return s;
                    });
                    // Recalculate score with updated recency
                    const newScore = calculateInitialScore(updatedSources, now, existingIoc.vt, existingIoc.abuseipdb);
                    const newSeverity = calculateSeverityFromScore(newScore);
                    
                    updateOp = {
                        $set: {
                            tags: updateTags,
                            last_seen: now,
                            sources: updatedSources,
                            score: newScore,
                            severity: newSeverity,
                        }
                    };
                }

                bulkOps.push({
                    updateOne: {
                        filter: { _id: existingIoc._id },
                        update: updateOp
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

module.exports = {
    fetchAndIngest,
};
