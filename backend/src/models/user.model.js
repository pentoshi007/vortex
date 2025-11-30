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

// Static method to create or update default admin (uses environment variable for security)
userSchema.statics.createDefaultAdmin = async function () {
    // Get admin credentials from environment variables
    const adminUsername = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@cti-dashboard.local';
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD;
    
    // Only proceed if password is set in environment
    if (!adminPassword) {
        console.log('No DEFAULT_ADMIN_PASSWORD set - skipping default admin creation/update');
        console.log('Set DEFAULT_ADMIN_PASSWORD environment variable to create initial admin user');
        return;
    }
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    // Check if any admin exists
    const existingAdmin = await this.findOne({ role: 'admin' });
    
    if (!existingAdmin) {
        // No admin exists, create one
        await this.create({
            username: adminUsername,
            email: adminEmail,
            role: 'admin',
            password_hash: hashedPassword,
        });
        console.log(`Default admin user created: ${adminUsername}`);
    } else {
        // Admin exists - check if we should update based on env var username match
        // Only update if the existing admin username matches the env var OR if FORCE_ADMIN_UPDATE is set
        const forceUpdate = process.env.FORCE_ADMIN_UPDATE === 'true';
        
        if (forceUpdate || existingAdmin.username === adminUsername) {
            // Update the existing admin's password
            existingAdmin.password_hash = hashedPassword;
            existingAdmin.username = adminUsername;
            existingAdmin.email = adminEmail;
            await existingAdmin.save();
            console.log(`Admin user updated: ${adminUsername}`);
        } else {
            console.log(`Admin user already exists (${existingAdmin.username}). Set FORCE_ADMIN_UPDATE=true to override.`);
        }
    }
};

const User = mongoose.model('User', userSchema);

module.exports = User;
