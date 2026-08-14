const express = require('express');
const router = express.Router();
const { Order } = require('../models/Order');
const { authMiddleware } = require('../middleware/auth');
const { sendSuccess, sendError } = require('../utils/response');

// GET all bills/invoices (We fetch Orders as every order acts as a bill)
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const orders = await Order.find({})
      .populate('customerId', 'fullName mobile email address')
      .populate('items.employeeId', 'fullName')
      .sort({ orderDate: -1 })
      .lean();

    // Map Orders to look like invoices for the frontend
    const mappedInvoices = orders.map(order => ({
      _id: order._id,
      invoiceNumber: order.invoice?.number || `INV-${order.orderNumber}`,
      issueDate: order.orderDate,
      totalAmount: order.totalAmount,
      customerId: order.customerId || {
        _id: 'unknown',
        fullName: order.customerName,
        mobile: order.customerPhone,
        companyGroupId: order.companyGroupId
      },
      orderId: {
        _id: order._id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        companyGroupId: order.companyGroupId,
        shareToken: order.shareToken,
        items: order.items,
        totalAmount: order.totalAmount,
        discount: order.discount,
        tax: order.tax,
        advancePaid: order.advancePaid,
        balanceAmount: order.balanceAmount
      }
    }));

    return sendSuccess(res, 200, 'Invoices retrieved successfully', mappedInvoices);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
