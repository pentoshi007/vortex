const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        password_hash: {
            type: String,
            required: true,
            private: true, // used by toJSON plugin if we had one
        },
        role: {
            type: String,
            enum: ['admin', 'analyst', 'viewer'],
            default: 'viewer',
        },
        last_login: {
            type: Date,
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
                delete ret.password_hash; // Don't expose password hash
                return ret;
            },
        },
    }
);

// Check if password matches the user's password
userSchema.methods.isPasswordMatch = async function (password) {
    return bcrypt.compare(password, this.password_hash);
};

userSchema.pre('save', async function (next) {
    if (this.isModified('password_hash')) {
        // If password_hash is already hashed (starts with $2), don't rehash
        // But here we expect the setter to handle hashing or the service to handle it.
        // In Flask code: set_password generates hash.
        // Let's assume the service will hash it before saving, or we can add a virtual 'password' field.
    }
    next();
});

// Static method to create default admin (uses environment variable for security)
userSchema.statics.createDefaultAdmin = async function () {
    const count = await this.countDocuments();
    if (count === 0) {
        // Get admin credentials from environment variables
        const adminUsername = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
        const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@cti-dashboard.local';
        const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD;
        
        // Only create default admin if password is set in environment
        if (!adminPassword) {
            console.log('No DEFAULT_ADMIN_PASSWORD set - skipping default admin creation');
            console.log('Set DEFAULT_ADMIN_PASSWORD environment variable to create initial admin user');
            return;
        }
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);

        await this.create({
            username: adminUsername,
            email: adminEmail,
            role: 'admin',
            password_hash: hashedPassword,
        });
        console.log(`Default admin user created: ${adminUsername}`);
    }
};

const User = mongoose.model('User', userSchema);

module.exports = User;
