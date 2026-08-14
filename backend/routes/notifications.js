const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { FabricInventory } = require('../models/Inventory');
const { Order } = require('../models/Order');
const { Notification } = require('../models/System');
const mongoose = require('mongoose');

// Return notifications for the authenticated user.
// Generates persistent notifications for low-stock fabrics and due/overdue orders if they don't already exist.
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || null;

    // Find fabrics that are low or out of stock
    const lowFabrics = await FabricInventory.find({
      $expr: { $lte: ["$totalAvailable", { $ifNull: ["$minimumStock", 10] }] }
    }).lean();

    for (const f of lowFabrics) {
      const link = `/inventory/${f._id}`;
      const exists = await Notification.findOne({ userId, link, title: 'Low Stock' });
      if (!exists) {
        await Notification.create({
          userId,
          title: 'Low Stock',
          message: `Fabric ${f.fabricId} (${f.name}) is running low: ${f.totalAvailable} m left.`,
          isRead: false,
          link,
          type: 'Alert'
        });
      }
    }

    // Find orders that are due now/overdue or due within next 24 hours
    const now = new Date();
    const soon = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const dueOrders = await Order.find({
      dueDate: { $lte: soon },
      $or: [ { dueDate: { $lte: now } }, { dueDate: { $gt: now, $lte: soon } } ],
      currentStage: { $nin: ['Delivered', 'Completed'] }
    }).lean();

    for (const o of dueOrders) {
      const link = `/orders/${o._id}`;
      const isOverdue = new Date(o.dueDate) <= now;
      const title = isOverdue ? 'Order Overdue' : 'Order Due Soon';
      const exists = await Notification.findOne({ userId, link, title });
      if (!exists) {
        await Notification.create({
          userId,
          title,
          message: `Order ${o.orderNumber} for ${o.customerName || 'Customer'} is ${isOverdue ? 'overdue' : 'due soon'} (${new Date(o.dueDate).toLocaleString()}).`,
          isRead: false,
          link,
          type: isOverdue ? 'Alert' : 'Warning'
        });
      }
    }

    // Fetch persisted notifications for the user and return sorted by newest first
    const notifications = await Notification.find({ userId, isDeleted: { $ne: true } }).sort({ createdAt: -1 }).lean();
    // Map to expected minimal shape for frontend
    const out = notifications.map(n => ({ id: n._id, title: n.title, message: n.message, isRead: n.isRead, createdAt: n.createdAt, link: n.link }));
    return res.json(out);
  } catch (err) {
    console.error('Notifications fetch failed', err);
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark all notifications as read for the user
router.post('/mark-read', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || null;
    await Notification.updateMany({ userId, isRead: false }, { $set: { isRead: true } });
    return res.json({ success: true });
  } catch (err) {
    console.error('Mark notifications read failed', err);
    return res.status(500).json({ error: 'Failed to mark notifications read' });
  }
});

// DELETE remove a notification (soft delete)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const notification = await Notification.findOneAndUpdate({ _id: req.params.id, userId }, { isDeleted: true });
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found or unauthorized' });
    }
    return res.json({ success: true, message: 'Notification deleted' });
  } catch (err) {
    console.error('Delete notification failed', err);
    return res.status(500).json({ error: 'Failed to delete notification' });
  }
});

module.exports = router;
