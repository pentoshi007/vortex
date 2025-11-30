const axios = require('axios');
const httpStatus = require('http-status').default;
const Lookup = require('../models/lookup.model');
const Indicator = require('../models/indicator.model');
const config = require('../config/config');
const logger = require('../config/logger');
const { detectType } = require('../utils/ioc.utils');
const iocsService = require('./iocs.service');
const rateLimiter = require('../utils/rateLimiter');

const performLookup = async (indicatorValue, userId) => {
    const type = detectType(indicatorValue);

    // Create lookup record
    const lookup = await Lookup.create({
        indicator: { type, value: indicatorValue },
        user_id: userId,
        status: 'pending',
    });

    try {
        const enrichmentData = {
            vt: null,
            abuseipdb: null,
        };

        // 1. VirusTotal Lookup
        if (config.external.vtApiKey) {
            try {
                let vtUrl;
                if (type === 'ip') vtUrl = `https://www.virustotal.com/api/v3/ip_addresses/${indicatorValue}`;
                else if (type === 'domain') vtUrl = `https://www.virustotal.com/api/v3/domains/${indicatorValue}`;
                else if (['md5', 'sha1', 'sha256'].includes(type)) vtUrl = `https://www.virustotal.com/api/v3/files/${indicatorValue}`;
                else if (type === 'url') {
                    // URL lookup requires encoding
                    const urlId = Buffer.from(indicatorValue).toString('base64').replace(/=/g, '');
                    vtUrl = `https://www.virustotal.com/api/v3/urls/${urlId}`;
                }

                if (vtUrl) {
                    const response = await axios.get(vtUrl, {
                        headers: { 'x-apikey': config.external.vtApiKey },
                    });

                    const attributes = response.data.data.attributes;
                    enrichmentData.vt = {
                        positives: attributes.last_analysis_stats?.malicious || 0,
                        total: Object.values(attributes.last_analysis_stats || {}).reduce((a, b) => a + b, 0),
                        last_fetched_at: attributes.last_analysis_date ? new Date(attributes.last_analysis_date * 1000) : new Date(),
                        last_analysis_stats: attributes.last_analysis_stats || { malicious: 0, suspicious: 0, harmless: 0, undetected: 0, timeout: 0 },
                        reputation: attributes.reputation || 0,
                        categories: Object.values(attributes.categories || {}),
                        title: attributes.meaningful_name || attributes.names?.[0] || '',
                        final_url: attributes.last_final_url || null,
                        permalink: `https://www.virustotal.com/gui/${type === 'ip' ? 'ip-address' : type}/${indicatorValue}`
                    };
                }
            } catch (error) {
                logger.error(`VirusTotal lookup failed: ${error.message}`);
            }
        }

        // 2. AbuseIPDB Lookup (only for IPs)
        if (type === 'ip' && config.external.abuseIpDbApiKey) {
            try {
                const response = await axios.get('https://api.abuseipdb.com/api/v2/check', {
                    params: { ipAddress: indicatorValue, maxAgeInDays: 90 },
                    headers: { 'Key': config.external.abuseIpDbApiKey, 'Accept': 'application/json' },
                });

                enrichmentData.abuseipdb = {
                    abuse_confidence: response.data.data.abuseConfidenceScore,
                    total_reports: response.data.data.totalReports,
                    last_reported: response.data.data.lastReportedAt,
                };
            } catch (error) {
                logger.error(`AbuseIPDB lookup failed: ${error.message}`);
            }
        }

        // Create or update IOC
        const iocData = {
            type,
            value: indicatorValue,
            vt: enrichmentData.vt,
            abuseipdb: enrichmentData.abuseipdb,
            // Score will be calculated by model hook
        };

        // Use iocsService to handle creation/update logic including score calculation
        let ioc;
        const existingIoc = await Indicator.findOne({ type, value: indicatorValue });

        if (existingIoc) {
            Object.assign(existingIoc, iocData);
            existingIoc.last_seen = new Date();
            await existingIoc.save();
            ioc = existingIoc;
        } else {
            ioc = new Indicator(iocData);
            // Add source
            ioc.sources.push({
                name: 'enrichment',
                first_seen: new Date(),
                last_seen: new Date(),
                ref: `Lookup by user ${userId}`,
            });
            await ioc.save();
        }

        // Update lookup record
        lookup.status = 'done';
        lookup.finished_at = new Date();
        lookup.result_indicator_id = ioc._id;
        await lookup.save();

        return { ioc, lookup };

    } catch (error) {
        lookup.status = 'error';
        lookup.error = error.message;
        lookup.finished_at = new Date();
        await lookup.save();
        throw error;
    }
};

const getLookupHistory = async (filter, options) => {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const lookups = await Lookup.find(filter).sort({ started_at: -1 }).skip(skip).limit(limit);
    const total = await Lookup.countDocuments(filter);

    // Populate IOC data manually or use populate if ref was set (it's string id in model)
    // Let's manually fetch IOCs to match Flask behavior
    const lookupsWithIoc = await Promise.all(lookups.map(async (lookup) => {
        const lookupObj = lookup.toJSON();
        if (lookup.result_indicator_id) {
            const ioc = await Indicator.findById(lookup.result_indicator_id);
            if (ioc) {
                lookupObj.ioc = {
                    id: ioc._id,
                    type: ioc.type,
                    value: ioc.value,
                    score: ioc.score,
                    severity: ioc.severity,
                };
            }
        }
        return lookupObj;
    }));

    return {
        lookups: lookupsWithIoc,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
        },
    };
};

const getLookupById = async (id) => {
    const lookup = await Lookup.findById(id);
    if (!lookup) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Lookup not found');
    }

    const lookupObj = lookup.toJSON();
    if (lookup.result_indicator_id) {
        const ioc = await Indicator.findById(lookup.result_indicator_id);
        if (ioc) {
            lookupObj.ioc = ioc.toJSON();
        }
    }

    return lookupObj;
};

const deleteLookup = async (id) => {
    const lookup = await Lookup.findById(id);
    if (!lookup) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Lookup not found');
    }
    await lookup.deleteOne();
    return lookup;
};

/**
 * Enrich a single IOC with external threat intelligence
 * Respects rate limits for free tier APIs
 * @param {Object} ioc - The IOC document to enrich
 * @param {boolean} waitForLimits - Whether to wait for rate limits (default: false for bulk)
 * @returns {Object} - Enrichment results with skipped flags
 */
const enrichSingleIoc = async (ioc, waitForLimits = false) => {
    const enrichmentData = {
        vt: null,
        abuseipdb: null,
        skipped: {
            vt: false,
            abuseipdb: false,
        },
    };

    // 1. VirusTotal Lookup (with rate limiting)
    if (config.external.vtApiKey) {
        // Check rate limit
        if (!rateLimiter.canRequestVirusTotal()) {
            if (waitForLimits) {
                // Wait for rate limit reset (max 65 seconds for minute limit)
                const waited = await rateLimiter.waitForRateLimit('virustotal', 65000);
                if (!waited) {
                    logger.debug(`VirusTotal daily limit reached, skipping ${ioc.value}`);
                    enrichmentData.skipped.vt = true;
                }
            } else {
                logger.debug(`VirusTotal rate limit hit, skipping ${ioc.value}`);
                enrichmentData.skipped.vt = true;
            }
        }

        if (!enrichmentData.skipped.vt) {
            try {
                let vtUrl;
                if (ioc.type === 'ip') vtUrl = `https://www.virustotal.com/api/v3/ip_addresses/${ioc.value}`;
                else if (ioc.type === 'domain') vtUrl = `https://www.virustotal.com/api/v3/domains/${ioc.value}`;
                else if (['md5', 'sha1', 'sha256'].includes(ioc.type)) vtUrl = `https://www.virustotal.com/api/v3/files/${ioc.value}`;
                else if (ioc.type === 'url') {
                    const urlId = Buffer.from(ioc.value).toString('base64').replace(/=/g, '');
                    vtUrl = `https://www.virustotal.com/api/v3/urls/${urlId}`;
                }

                if (vtUrl) {
                    // Record the request before making it
                    rateLimiter.recordVirusTotalRequest();
                    
                    const response = await axios.get(vtUrl, {
                        headers: { 'x-apikey': config.external.vtApiKey },
                        timeout: 15000,
                    });

                    const attributes = response.data.data.attributes;
                    enrichmentData.vt = {
                        positives: attributes.last_analysis_stats?.malicious || 0,
                        total: Object.values(attributes.last_analysis_stats || {}).reduce((a, b) => a + b, 0),
                        scan_date: new Date(),
                    };
                }
            } catch (error) {
                // Handle rate limit errors from API (429)
                if (error.response?.status === 429) {
                    logger.warn(`VirusTotal API rate limit exceeded for ${ioc.value}`);
                    enrichmentData.skipped.vt = true;
                } else {
                    logger.debug(`VirusTotal lookup failed for ${ioc.value}: ${error.message}`);
                }
            }
        }
    }

    // 2. AbuseIPDB Lookup (only for IPs, with rate limiting)
    if (ioc.type === 'ip' && config.external.abuseIpDbApiKey) {
        // Check rate limit
        if (!rateLimiter.canRequestAbuseIPDB()) {
            logger.debug(`AbuseIPDB daily limit reached, skipping ${ioc.value}`);
            enrichmentData.skipped.abuseipdb = true;
        }

        if (!enrichmentData.skipped.abuseipdb) {
            try {
                // Record the request before making it
                rateLimiter.recordAbuseIPDBRequest();
                
                const response = await axios.get('https://api.abuseipdb.com/api/v2/check', {
                    params: { ipAddress: ioc.value, maxAgeInDays: 90 },
                    headers: { 'Key': config.external.abuseIpDbApiKey, 'Accept': 'application/json' },
                    timeout: 15000,
                });

                enrichmentData.abuseipdb = {
                    abuse_confidence: response.data.data.abuseConfidenceScore,
                    total_reports: response.data.data.totalReports,
                    last_reported: response.data.data.lastReportedAt,
                };
            } catch (error) {
                // Handle rate limit errors from API (429)
                if (error.response?.status === 429) {
                    logger.warn(`AbuseIPDB API rate limit exceeded for ${ioc.value}`);
                    enrichmentData.skipped.abuseipdb = true;
                } else {
                    logger.debug(`AbuseIPDB lookup failed for ${ioc.value}: ${error.message}`);
                }
            }
        }
    }

    return enrichmentData;
};

/**
 * Bulk enrich recent IOCs with rate limiting for free tier APIs
 * Optimized for serverless environments (respects execution time limits)
 * @param {number} limit - Max IOCs to process (default: 10 for free tier rate limits)
 * @param {number} maxExecutionTime - Max execution time in ms (default: 55s for serverless)
 */
const bulkEnrichRecentIocs = async (limit = 10, maxExecutionTime = 55000) => {
    const startTime = new Date();
    let processedCount = 0;
    let enrichedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    try {
        // For free tier: VT allows 4/min, AbuseIPDB allows ~41/hour
        // Limit processing to avoid hitting rate limits
        const effectiveLimit = Math.min(limit, 10); // Max 10 per run for free tier

        logger.info(`Starting bulk enrichment of up to ${effectiveLimit} IOCs`);

        // Find IOCs that need enrichment: recently added or not enriched in last 24h
        const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const query = {
            $or: [
                { 'vt.scan_date': { $exists: false } },
                { 'vt.scan_date': { $lt: cutoffTime } },
                { created_at: { $gte: cutoffTime } }
            ]
        };

        const totalCandidates = await Indicator.countDocuments(query);
        const iocs = await Indicator.find(query).limit(effectiveLimit);

        logger.info(`Found ${totalCandidates} IOCs needing enrichment, processing ${iocs.length}`);

        // Get current rate limit status
        const rateLimitStatus = rateLimiter.getRateLimitStatus();
        logger.info(`Rate limits - VT: ${rateLimitStatus.virustotal.dailyRemaining}/day, ${rateLimitStatus.virustotal.minuteRemaining}/min | AbuseIPDB: ${rateLimitStatus.abuseipdb.dailyRemaining}/day`);

        for (const ioc of iocs) {
            // Check execution time limit (for serverless)
            const elapsed = Date.now() - startTime.getTime();
            if (elapsed >= maxExecutionTime) {
                logger.warn(`Execution time limit reached (${elapsed}ms), stopping enrichment`);
                break;
            }

            processedCount++;
            try {
                // Perform enrichment with rate limiting (wait for limits in bulk mode)
                const enrichmentData = await enrichSingleIoc(ioc, true);

                // Check if we got any enrichment data
                const hasVtData = enrichmentData.vt && Object.keys(enrichmentData.vt).length > 0;
                const hasAbuseData = enrichmentData.abuseipdb && Object.keys(enrichmentData.abuseipdb).length > 0;
                const wasSkipped = enrichmentData.skipped?.vt || enrichmentData.skipped?.abuseipdb;

                if (wasSkipped) {
                    skippedCount++;
                }

                if (hasVtData || hasAbuseData) {
                    // Update the IOC with enrichment data
                    if (hasVtData) {
                        ioc.vt = enrichmentData.vt;
                    }
                    if (hasAbuseData) {
                        ioc.abuseipdb = enrichmentData.abuseipdb;
                    }
                    ioc.last_seen = new Date();
                    await ioc.save();
                    enrichedCount++;
                    logger.debug(`Enriched IOC ${ioc.value}`);
                }

                // Wait 15 seconds between requests for VT free tier (4 req/min = 1 per 15s)
                // This ensures we stay well within limits
                await new Promise(resolve => setTimeout(resolve, 15000));
            } catch (err) {
                errorCount++;
                logger.error(`Error enriching IOC ${ioc.value}: ${err.message}`);
            }
        }

        const duration = (new Date() - startTime) / 1000;

        // Record run
        const EnrichmentRun = require('../models/enrichment_run.model');
        await EnrichmentRun.create({
            operation: 'enrichment',
            source: 'bulk',
            status: 'completed',
            started_at: startTime,
            finished_at: new Date(),
            processed_count: processedCount,
            enriched_count: enrichedCount,
            error_count: errorCount,
            total_candidates: totalCandidates,
            duration_seconds: duration,
        });

        logger.info(`Bulk enrichment completed. Processed: ${processedCount}, Enriched: ${enrichedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`);

        return {
            processed_count: processedCount,
            enriched_count: enrichedCount,
            skipped_count: skippedCount,
            error_count: errorCount,
            total_candidates: totalCandidates,
            duration_seconds: duration,
            rate_limit_status: rateLimiter.getRateLimitStatus(),
        };

    } catch (error) {
        const duration = (new Date() - startTime) / 1000;
        logger.error(`Bulk enrichment failed: ${error.message}`);
        const EnrichmentRun = require('../models/enrichment_run.model');
        await EnrichmentRun.create({
            operation: 'enrichment',
            source: 'bulk',
            status: 'failed',
            started_at: startTime,
            finished_at: new Date(),
            processed_count: processedCount,
            enriched_count: enrichedCount,
            error_count: errorCount,
            duration_seconds: duration,
            error: error.message,
        });
        throw error;
    }
};

module.exports = {
    performLookup,
    getLookupHistory,
    getLookupById,
    deleteLookup,
    bulkEnrichRecentIocs,
};
