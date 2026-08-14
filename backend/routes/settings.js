const express = require('express');
const router = express.Router();
const { Setting } = require('../models/System');
const { authMiddleware } = require('../middleware/auth');
const { sendSuccess, sendError } = require('../utils/response');

// GET all settings
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const settings = await Setting.find({}).lean();
    const settingsObj = {};
    settings.forEach(s => {
      settingsObj[s.key] = s.value;
    });
    return sendSuccess(res, 200, 'Settings retrieved successfully', settingsObj);
  } catch (err) {
    next(err);
  }
});

// POST update settings
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const updates = req.body;
    
    const promises = Object.keys(updates).map(key => {
      return Setting.findOneAndUpdate(
        { key },
        { value: updates[key], group: 'General' },
        { upsert: true, new: true }
      );
    });
    
    await Promise.all(promises);
    return sendSuccess(res, 200, 'Settings updated successfully');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
