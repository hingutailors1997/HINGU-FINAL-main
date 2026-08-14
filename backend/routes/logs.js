const express = require('express');
const router = express.Router();
const { AuditLog, ActivityLog } = require('../models/System');
const { ScanHistory } = require('../models/Inventory');
const { authMiddleware } = require('../middleware/auth');
const { sendSuccess, sendError } = require('../utils/response');

// GET system audit logs
router.get('/audit', authMiddleware, async (req, res) => {
  try {
    const logs = await AuditLog.find().populate('userId', 'name email role').sort({ createdAt: -1 }).limit(100).lean();
    return sendSuccess(res, 200, 'Audit logs retrieved from database', logs);
  } catch (error) {
    return sendError(res, 500, 'Failed to fetch audit logs', error.message);
  }
});

// GET user activity logs
router.get('/activity', authMiddleware, async (req, res) => {
  try {
    const activities = await ActivityLog.find().populate('userId', 'name email role').sort({ createdAt: -1 }).limit(100).lean();
    return sendSuccess(res, 200, 'Activity logs retrieved from database', activities);
  } catch (error) {
    return sendError(res, 500, 'Failed to fetch activity logs', error.message);
  }
});

// GET scanner history logs
router.get('/scans', authMiddleware, async (req, res) => {
  try {
    const scans = await ScanHistory.find().populate('userId', 'name email').sort({ createdAt: -1 }).limit(100).lean();
    return sendSuccess(res, 200, 'Scan history retrieved from database', scans);
  } catch (error) {
    return sendError(res, 500, 'Failed to fetch scan logs', error.message);
  }
});

module.exports = router;
