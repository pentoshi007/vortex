const mongoose = require('mongoose');
const config = require('./config');
const logger = require('./logger');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(config.mongo.uri, {
            dbName: config.mongo.dbName,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        logger.info(`MongoDB Connected: ${conn.connection.host}`);

        // Create default admin user if no users exist
        try {
            const User = require('../models/user.model');
            await User.createDefaultAdmin();
        } catch (error) {
            logger.error(`Error creating default admin user: ${error.message}`);
        }

        // Handle connection events
        mongoose.connection.on('error', (err) => {
            logger.error(`MongoDB connection error: ${err}`);
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB disconnected');
        });

    } catch (error) {
        logger.error(`Error connecting to MongoDB: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
