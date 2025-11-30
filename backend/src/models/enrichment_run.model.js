const mongoose = require('mongoose');

const enrichmentRunSchema = mongoose.Schema(
    {
        operation: {
            type: String,
            required: true,
            default: 'bulk_enrichment',
        },
        source: {
            type: String,
            default: 'manual',
        },
        status: {
            type: String,
            enum: ['completed', 'error', 'running', 'failed'],
            default: 'running',
        },
        started_at: {
            type: Date,
            default: Date.now,
        },
        finished_at: {
            type: Date,
        },
        // For ingestion runs
        new_count: {
            type: Number,
            default: 0,
        },
        updated_count: {
            type: Number,
            default: 0,
        },
        fetched_count: {
            type: Number,
            default: 0,
        },
        // For enrichment runs
        processed_count: {
            type: Number,
            default: 0,
        },
        enriched_count: {
            type: Number,
            default: 0,
        },
        error_count: {
            type: Number,
            default: 0,
        },
        total_candidates: {
            type: Number,
            default: 0,
        },
        duration_seconds: {
            type: Number,
            default: 0,
        },
        error: {
            type: String,
        },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform: function(doc, ret) {
                ret.id = ret._id;
                delete ret.__v;
                return ret;
            }
        },
    }
);

const EnrichmentRun = mongoose.model('EnrichmentRun', enrichmentRunSchema);

module.exports = EnrichmentRun;
