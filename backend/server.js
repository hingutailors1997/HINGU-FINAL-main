const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { validateEnv } = require('./config/env');

dotenv.config();
validateEnv(); // Verify critical environment variables on startup

const app = express();
const PORT = process.env.PORT || 5000;

// Security and Request Logging Middleware
const requestLogger = require('./middleware/logger');
const { securityHeaders, mongoInjectionProtection, rateLimiter } = require('./middleware/security');

app.use(securityHeaders);
app.use(cors({ 
  origin: (origin, callback) => {
    // Allow local network devices (192.168.x.x, 10.x.x.x, localhost, etc.) for seamless mobile device testing
    if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('192.168.') || origin.includes('10.') || origin === process.env.CLIENT_URL) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  }, 
  credentials: true 
}));
app.use(express.json({ limit: '10mb' })); // 10MB limit as requested
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(mongoInjectionProtection);
app.use(rateLimiter);
app.use(requestLogger);

// Serve uploaded files (invoices, customer photos) from /uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const { connectDB, getConnectionStatus } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { sendSuccess, sendError } = require('./utils/response');

// Comprehensive Health check and DB Connection Status API
app.get('/api/status', async (req, res) => {
  try {
    const dbStatus = getConnectionStatus();
    let dbPing = 'unreachable';
    try {
      if (mongoose.connection && mongoose.connection.db) {
        const pingResult = await mongoose.connection.db.command({ ping: 1 });
        dbPing = pingResult.ok === 1 ? 'ok (1)' : 'failed';
      }
    } catch (e) {
      dbPing = e.message;
    }

    return sendSuccess(res, 200, 'System Health Status', {
      appVersion: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      apiStatus: 'Operational',
      mongoStatus: dbStatus,
      mongoPing: dbPing,
      serverUptimeSeconds: Math.round(process.uptime()),
      memoryUsage: {
        rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
      },
      nodeVersion: process.version,
      timestamp: new Date()
    });
  } catch (err) {
    return sendError(res, 500, 'Health check diagnosis failed', err);
  }
});


app.get('/api/debug-db', async (req, res) => {
  try {
    const { Customer } = require('./models/CRM');
    const { Order } = require('./models/Order');
    const customers = await Customer.find().lean();
    const orders = await Order.find().lean();
    return sendSuccess(res, 200, 'Debug Data Fetched', { customers, orders });
  } catch(err) {
    return sendError(res, 500, 'Failed to fetch debug data', { error: err.message });
  }
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/groups', require('./routes/customerGroups'));
app.use('/api/measurements', require('./routes/measurements'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/stock', require('./routes/stock'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/logs', require('./routes/logs'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/public', require('./routes/public')); // Unauthenticated Public Endpoints

// Catch-all 404 handler for API routes
app.use('/api/*', (req, res) => {
  console.error(`[404 Not Found] Unhandled API route: ${req.method} ${req.originalUrl}`);
  return sendError(res, 404, `Endpoint not found: ${req.method} ${req.originalUrl}`);
});

// Basic Route
app.get('/', (req, res) => {
  res.send('Hingu Tailors ERP API is running (Production DB Connected)');
});

// Global Error Handling Middleware
app.use(errorHandler);

// Connect to DB and Start Server
connectDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT} across all network interfaces (e.g., http://192.168.0.119:${PORT})`);
    
    // Quick background sync to fix data for user
    setTimeout(async () => {
      try {
        const { Customer } = require('./models/CRM');
        const { Order } = require('./models/Order');
        const customers = await Customer.find();
        for (const c of customers) {
          const orders = await Order.find({ customerId: c._id });
          const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
          const advancePaid = orders.reduce((sum, o) => sum + (o.advancePaid || 0), 0);
          await Customer.findByIdAndUpdate(c._id, {
            totalOrders: orders.length,
            totalRevenue,
            pendingBalance: totalRevenue - advancePaid
          });
        }
        console.log('Background sync complete');
      } catch(err) {
        console.error('Sync failed', err.message);
      }
    }, 2000);
  });
}).catch(err => {
  console.error('Failed to connect to database. Server not started.');
  process.exit(1);
});

