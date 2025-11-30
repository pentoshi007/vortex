const mongoose = require('mongoose');

const sourceSchema = mongoose.Schema({
    name: String,
    first_seen: Date,
    last_seen: Date,
    ref: String,
}, { _id: false });

const indicatorSchema = mongoose.Schema(
    {
        type: {
            type: String,
            required: true,
            enum: ['ip', 'domain', 'url', 'sha256', 'md5', 'sha1'],
            lowercase: true,
        },
        value: {
            type: String,
            required: true,
            trim: true,
        },
        sources: [sourceSchema],
        score: {
            type: Number,
            default: 0,
            min: 0,
            max: 100,
        },
        severity: {
            type: String,
            enum: ['info', 'low', 'medium', 'high', 'critical'],
            default: 'info',
        },
        vt: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        abuseipdb: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        tags: [String],
        first_seen: {
            type: Date,
            default: Date.now,
        },
        last_seen: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
        toJSON: {
            virtuals: true,
            transform: function (doc, ret) {
                ret.id = ret._id.toString();
                delete ret._id;
                delete ret.__v;
                return ret;
            },
        },
        toObject: {
            virtuals: true,
            transform: function (doc, ret) {
                ret.id = ret._id.toString();
                delete ret._id;
                delete ret.__v;
                return ret;
            },
        },
    }
);

// Compound index for type and value
indicatorSchema.index({ type: 1, value: 1 }, { unique: true });
indicatorSchema.index({ last_seen: 1 });
indicatorSchema.index({ severity: 1, last_seen: 1 });
indicatorSchema.index({ tags: 1, last_seen: 1 });
indicatorSchema.index({ score: 1 });

// Calculate score method
indicatorSchema.methods.calculateScore = function () {
    let score = 0;

    // Base score from number of sources
    const sourceScore = Math.min(this.sources.length * 10, 30);
    score += sourceScore;

    // Recency score
    if (this.last_seen) {
        const hoursAgo = (Date.now() - this.last_seen.getTime()) / (1000 * 60 * 60);
        if (hoursAgo < 24) score += 20;
        else if (hoursAgo < 168) score += 15;
        else if (hoursAgo < 720) score += 10;
    }

    // VirusTotal score
    if (this.vt && this.vt.positives && this.vt.total) {
        const vtRatio = this.vt.positives / this.vt.total;
        score += Math.floor(vtRatio * 30);
    }

    // AbuseIPDB score
    if (this.type === 'ip' && this.abuseipdb && this.abuseipdb.abuse_confidence) {
        const confidence = this.abuseipdb.abuse_confidence;
        if (confidence >= 90) score += 20;
        else if (confidence >= 75) score += 15;
        else if (confidence >= 50) score += 10;
        else if (confidence >= 25) score += 5;
        else if (confidence > 0) score += 2;
    }

    return Math.min(score, 100);
};

// Update severity based on score
indicatorSchema.methods.updateSeverity = function () {
    if (this.score >= 85) this.severity = 'critical';
    else if (this.score >= 70) this.severity = 'high';
    else if (this.score >= 50) this.severity = 'medium';
    else if (this.score >= 25) this.severity = 'low';
    else this.severity = 'info';
};

indicatorSchema.pre('save', function (next) {
    this.score = this.calculateScore();
    this.updateSeverity();
    next();
});

const Indicator = mongoose.model('Indicator', indicatorSchema);

module.exports = Indicator;
