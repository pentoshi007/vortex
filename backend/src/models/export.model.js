const mongoose = require('mongoose');

const exportSchema = mongoose.Schema(
    {
        format: {
            type: String,
            enum: ['csv', 'json', 'stix'],
            required: true,
        },
        query: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        created_by: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'error'],
            default: 'pending',
        },
        file_url: {
            type: String,
        },
        row_count: {
            type: Number,
        },
        error: {
            type: String,
        },
        finished_at: {
            type: Date,
        },
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: false },
    }
);

// TTL index for 7 days
exportSchema.index({ created_at: 1 }, { expireAfterSeconds: 604800 });
exportSchema.index({ created_by: 1, created_at: 1 });
exportSchema.index({ status: 1 });

const Export = mongoose.model('Export', exportSchema);

module.exports = Export;
