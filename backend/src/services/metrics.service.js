const Indicator = require('../models/indicator.model');
const Lookup = require('../models/lookup.model');
const Tag = require('../models/tag.model');
const EnrichmentRun = require('../models/enrichment_run.model');
const mongoose = require('mongoose');

const getOverview = async () => {
    const now = new Date();
    const last24h = new Date(now - 24 * 60 * 60 * 1000);
    const last7d = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [
        totalIocs,
        recentIocs24h,
        recentIocs7d,
        recentIocs30d,
        iocTypes,
        severityBreakdown,
        highSeverityCount,
        totalLookups,
        recentLookups24h,
        recentLookups7d,
        successfulLookups,
        totalTags,
        topTags,
        topSources,
    ] = await Promise.all([
        Indicator.countDocuments(),
        Indicator.countDocuments({ created_at: { $gte: last24h } }),
        Indicator.countDocuments({ created_at: { $gte: last7d } }),
        Indicator.countDocuments({ created_at: { $gte: last30d } }),
        Indicator.aggregate([
            { $group: { _id: '$type', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]),
        Indicator.aggregate([
            { $group: { _id: '$severity', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]),
        Indicator.countDocuments({ severity: { $in: ['high', 'critical'] } }),
        Lookup.countDocuments(),
        Lookup.countDocuments({ started_at: { $gte: last24h } }),
        Lookup.countDocuments({ started_at: { $gte: last7d } }),
        Lookup.countDocuments({ status: 'done' }),
        Tag.countDocuments(),
        Indicator.aggregate([
            { $unwind: '$tags' },
            { $group: { _id: '$tags', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
        ]),
        Indicator.aggregate([
            { $unwind: '$sources' },
            { $group: { _id: '$sources.name', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
        ]),
    ]);

    const iocTypesMap = {};
    iocTypes.forEach((item) => (iocTypesMap[item._id] = item.count));

    const severityMap = {};
    severityBreakdown.forEach((item) => (severityMap[item._id] = item.count));

    return {
        ioc_metrics: {
            total: totalIocs,
            recent_24h: recentIocs24h,
            recent_7d: recentIocs7d,
            recent_30d: recentIocs30d,
            by_type: iocTypesMap,
            by_severity: severityMap,
            high_severity_count: highSeverityCount,
        },
        lookup_metrics: {
            total: totalLookups,
            recent_24h: recentLookups24h,
            recent_7d: recentLookups7d,
            success_rate: totalLookups > 0 ? (successfulLookups / totalLookups) * 100 : 0,
        },
        tag_metrics: {
            total_tags: totalTags,
            top_tags: topTags.map((t) => ({ name: t._id, count: t.count })),
        },
        source_metrics: {
            top_sources: topSources.map((s) => ({ name: s._id, count: s.count })),
        },
        generated_at: now.toISOString(),
    };
};

const getTimeseries = async (days = 30) => {
    const now = new Date();
    const startDate = new Date(now - days * 24 * 60 * 60 * 1000);

    const [iocResult, lookupResult, scoreResult] = await Promise.all([
        Indicator.aggregate([
            { $match: { created_at: { $gte: startDate } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } },
                    count: { $sum: 1 },
                    by_type: { $push: '$type' },
                },
            },
            { $sort: { _id: 1 } },
        ]),
        Lookup.aggregate([
            { $match: { started_at: { $gte: startDate } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$started_at' } },
                    total: { $sum: 1 },
                    successful: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
                    failed: { $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] } },
                },
            },
            { $sort: { _id: 1 } },
        ]),
        Indicator.aggregate([
            { $match: { score: { $exists: true } } },
            {
                $group: {
                    _id: {
                        $switch: {
                            branches: [
                                { case: { $lte: ['$score', 25] }, then: '0-25' },
                                { case: { $lte: ['$score', 50] }, then: '26-50' },
                                { case: { $lte: ['$score', 75] }, then: '51-75' },
                                { case: { $lte: ['$score', 100] }, then: '76-100' },
                            ],
                            default: 'unknown',
                        },
                    },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]),
    ]);

    const iocTimeseries = iocResult.map((doc) => {
        const typeCounts = {};
        doc.by_type.forEach((type) => {
            typeCounts[type] = (typeCounts[type] || 0) + 1;
        });
        return {
            date: doc._id,
            total: doc.count,
            by_type: typeCounts,
        };
    });

    const lookupTimeseries = lookupResult.map((doc) => ({
        date: doc._id,
        total: doc.total,
        successful: doc.successful,
        failed: doc.failed,
        success_rate: doc.total > 0 ? (doc.successful / doc.total) * 100 : 0,
    }));

    const scoreDistribution = {};
    scoreResult.forEach((doc) => (scoreDistribution[doc._id] = doc.count));

    return {
        ioc_timeseries: iocTimeseries,
        lookup_timeseries: lookupTimeseries,
        score_distribution: scoreDistribution,
        period_days: days,
        generated_at: now.toISOString(),
    };
};

const getThreats = async () => {
    const [
        threatLevels,
        recentHighSeverity,
        vtStatsResult,
        abuseIpDbStatsResult,
    ] = await Promise.all([
        Promise.all([
            Indicator.countDocuments({ severity: 'critical' }),
            Indicator.countDocuments({ severity: 'high' }),
            Indicator.countDocuments({ severity: 'medium' }),
            Indicator.countDocuments({ severity: 'low' }),
            Indicator.countDocuments({ severity: 'info' }),
        ]),
        Indicator.find({ severity: { $in: ['high', 'critical'] } })
            .select('type value score severity last_seen')
            .sort({ last_seen: -1 })
            .limit(10),
        Indicator.aggregate([
            { $match: { vt: { $exists: true } } },
            {
                $group: {
                    _id: null,
                    total_with_vt: { $sum: 1 },
                    malicious_detections: { $sum: { $cond: [{ $gt: ['$vt.positives', 0] }, 1, 0] } },
                    avg_positives: { $avg: '$vt.positives' },
                    max_positives: { $max: '$vt.positives' },
                },
            },
        ]),
        Indicator.aggregate([
            { $match: { type: 'ip', abuseipdb: { $exists: true } } },
            {
                $group: {
                    _id: null,
                    total_with_abuseipdb: { $sum: 1 },
                    high_confidence: { $sum: { $cond: [{ $gte: ['$abuseipdb.abuse_confidence', 75] }, 1, 0] } },
                    avg_confidence: { $avg: '$abuseipdb.abuse_confidence' },
                },
            },
        ]),
    ]);

    const vtStats = vtStatsResult[0] || {};
    const abuseIpDbStats = abuseIpDbStatsResult[0] || {};

    return {
        threat_levels: {
            critical: threatLevels[0],
            high: threatLevels[1],
            medium: threatLevels[2],
            low: threatLevels[3],
            info: threatLevels[4],
        },
        recent_high_severity: recentHighSeverity.map((doc) => ({
            id: doc._id,
            type: doc.type,
            value: doc.value,
            score: doc.score,
            severity: doc.severity,
            last_seen: doc.last_seen,
        })),
        virustotal_stats: {
            total_scanned: vtStats.total_with_vt || 0,
            malicious_count: vtStats.malicious_detections || 0,
            avg_positives: parseFloat((vtStats.avg_positives || 0).toFixed(2)),
            max_positives: vtStats.max_positives || 0,
        },
        abuseipdb_stats: {
            total_scanned: abuseIpDbStats.total_with_abuseipdb || 0,
            high_confidence_count: abuseIpDbStats.high_confidence || 0,
            avg_confidence: parseFloat((abuseIpDbStats.avg_confidence || 0).toFixed(2)),
        },
        generated_at: new Date().toISOString(),
    };
};

const getSystemStats = async () => {
    const dbStats = await mongoose.connection.db.stats();
    const totalSize = (dbStats.dataSize + dbStats.indexSize) / (1024 * 1024);

    const [
        indicatorsCount,
        lookupsCount,
        tagsCount,
        enrichmentRunsCount,
        lastEnrichment,
    ] = await Promise.all([
        Indicator.countDocuments(),
        Lookup.countDocuments(),
        Tag.countDocuments(),
        EnrichmentRun.countDocuments(),
        EnrichmentRun.findOne().sort({ finished_at: -1 }),
    ]);

    const now = new Date();
    const lastHour = new Date(now - 60 * 60 * 1000);
    const last24h = new Date(now - 24 * 60 * 60 * 1000);

    const [
        newIocsLastHour,
        lookupsLastHour,
        newIocsLast24h,
        lookupsLast24h,
    ] = await Promise.all([
        Indicator.countDocuments({ created_at: { $gte: lastHour } }),
        Lookup.countDocuments({ started_at: { $gte: lastHour } }),
        Indicator.countDocuments({ created_at: { $gte: last24h } }),
        Lookup.countDocuments({ started_at: { $gte: last24h } }),
    ]);

    return {
        database: {
            total_size_mb: parseFloat(totalSize.toFixed(2)),
            collections: {
                indicators: indicatorsCount,
                lookups: lookupsCount,
                tags: tagsCount,
                enrichment_runs: enrichmentRunsCount,
            },
        },
        recent_activity: {
            last_hour: {
                new_iocs: newIocsLastHour,
                lookups: lookupsLastHour,
            },
            last_24h: {
                new_iocs: newIocsLast24h,
                lookups: lookupsLast24h,
            },
        },
        enrichment: lastEnrichment
            ? {
                last_run: lastEnrichment.finished_at,
                status: lastEnrichment.status,
                processed_count: lastEnrichment.processed_count,
                duration_seconds: lastEnrichment.duration_seconds,
            }
            : null,
        generated_at: now.toISOString(),
    };
};

module.exports = {
    getOverview,
    getTimeseries,
    getThreats,
    getSystemStats,
};
