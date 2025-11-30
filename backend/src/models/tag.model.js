const mongoose = require('mongoose');

const tagSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        color: {
            type: String,
            default: '#6B7280',
        },
        description: {
            type: String,
        },
        created_by: {
            type: String,
        },
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: false },
        toJSON: {
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

const Tag = mongoose.model('Tag', tagSchema);

module.exports = Tag;
