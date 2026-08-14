const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hingu_erp';

// Connection pooling and timeout configuration
const OPTIONS = {
  maxPoolSize: 20,           // Maintain up to 20 socket connections in the pool
  minPoolSize: 2,            // Keep at least 2 connections open at all times
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds before error
  socketTimeoutMS: 45000,    // Close sockets after 45 seconds of inactivity
};

const MAX_RETRIES = parseInt(process.env.DB_MAX_RETRIES || '5', 10);
let retryCount = 0;
let isConnected = false;
let isMemoryServer = false;
let reconnectTimer = null;

const connectDB = async () => {
  if (isConnected) {
    console.log('⚡ Using existing MongoDB connection');
    return;
  }

  // Clear any pending reconnect timers to avoid memory leaks
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  // Monitor connection events (ensure listeners aren't duplicated)
  if (mongoose.connection.listenerCount('connected') === 0) {
    mongoose.connection.on('connected', () => {
      isConnected = true;
      retryCount = 0;
      console.log('✅ MongoDB connected successfully (Pool size configured: max 20, min 2)');
    });

    mongoose.connection.on('error', (err) => {
      console.error(`❌ MongoDB connection error: ${err.message}`);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      console.warn('⚠️ MongoDB disconnected.');
      if (!isMemoryServer && retryCount < MAX_RETRIES) {
        retryCount++;
        console.warn(`⏳ Attempting automatic reconnection (${retryCount}/${MAX_RETRIES}) in 5s...`);
        reconnectTimer = setTimeout(connectDB, 5000);
      } else if (retryCount >= MAX_RETRIES) {
        console.error(`❌ Max MongoDB reconnection attempts (${MAX_RETRIES}) reached. Stopping retries.`);
      }
    });
  }

  try {
    console.log(`📡 Connecting to MongoDB at: ${MONGODB_URI.replace(/\/\/.*@/, '//<hidden>@')} ...`);
    await mongoose.connect(MONGODB_URI, OPTIONS);
    isConnected = true;
  } catch (err) {
    console.warn(`⚠️ Local MongoDB Daemon unreachable (${err.message}).`);
    console.warn(`🚀 Falling back to In-Memory Database (MongoMemoryServer) for uninterrupted operations...`);
    
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      isMemoryServer = true;
      
      // Disconnect failed connection attempt before connecting to fallback
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      
      await mongoose.connect(mongoUri, OPTIONS);
      isConnected = true;
      console.log(`✅ Connected to fallback In-Memory MongoDB successfully (${mongoUri})`);
    } catch (fallbackErr) {
      console.error('❌ Critical: Failed to start fallback database:', fallbackErr.message);
      process.exit(1);
    }
  }
};

// Graceful application shutdown
const closeConnection = async (signal) => {
  try {
    await mongoose.connection.close();
    console.log(`🛑 MongoDB connection closed safely due to app termination (${signal})`);
  } catch (err) {
    console.error(`Error closing MongoDB connection on ${signal}:`, err);
  }
};

process.on('SIGINT', async () => {
  await closeConnection('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeConnection('SIGTERM');
  process.exit(0);
});

const getConnectionStatus = () => ({
  isConnected: mongoose.connection.readyState === 1,
  state: mongoose.connection.readyState,
  host: mongoose.connection.host || 'in-memory',
  name: mongoose.connection.name || 'hingu_erp',
  retryCount,
  maxRetries: MAX_RETRIES
});

module.exports = {
  connectDB,
  getConnectionStatus,
  closeConnection
};

