const mongoose = require('mongoose');

const lookupSchema = mongoose.Schema(
    {
        indicator: {
            type: {
                type: String,
                required: true,
            },
            value: {
                type: String,
                required: true,
            },
        },
        user_id: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'done', 'error'],
            default: 'pending',
        },
        started_at: {
            type: Date,
            default: Date.now,
        },
        finished_at: {
            type: Date,
        },
        result_indicator_id: {
            type: String,
        },
        error: {
            type: String,
        },
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: false },
    }
);

// TTL index for 30 days
lookupSchema.index({ created_at: 1 }, { expireAfterSeconds: 2592000 });
lookupSchema.index({ user_id: 1, created_at: 1 });
lookupSchema.index({ status: 1 });

const Lookup = mongoose.model('Lookup', lookupSchema);

module.exports = Lookup;
