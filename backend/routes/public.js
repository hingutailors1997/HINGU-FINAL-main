const express = require('express');
const router = express.Router();
const { Order } = require('../models/Order');
const { Customer } = require('../models/CRM');
const { CustomerMeasurement } = require('../models/Measurement');
const { Invoice } = require('../models/Finance');
const { Setting } = require('../models/System');
const { sendSuccess, sendError } = require('../utils/response');

// GET /api/public/share/:token
// No authentication required. Strips internal ERP data.
router.get('/share/:token', async (req, res, next) => {
  try {
    const { token } = req.params;
    if (!token || token.length < 10) {
      return sendError(res, 404, 'Invalid Link');
    }

    // 1. Fetch Order using token
    const order = await Order.findOne({ shareToken: token }).populate('customerId').lean();
    if (!order) {
      return sendError(res, 404, 'Invalid Link');
    }

    // 2. Fetch Measurements for the Customer
    let garments = [];
    if (order.customerId && order.customerId._id) {
      garments = await CustomerMeasurement.find({ customerId: order.customerId._id }).lean();
    }

    // 3. Fetch Invoice if exists
    const invoice = await Invoice.findOne({ orderId: order._id }).lean();

    // 4. Strip internal, sensitive data before sending to client
    
    // Clean Order Data
    const cleanOrder = {
      orderNumber: order.orderNumber,
      orderDate: order.orderDate,
      deliveryDate: order.deliveryDate,
      customerName: order.customerName,
      assignedTailorName: order.assignedTailorName,
      currentStage: order.currentStage,
      totalAmount: order.totalAmount,
      advancePaid: order.advancePaid,
      balanceAmount: order.balanceAmount,
      discount: order.discount,
      tax: order.tax,
      items: order.items ? order.items.map(item => ({
        garmentType: item.garmentType,
        quantity: item.quantity,
        fabricName: item.fabricName,
        fabricBarcode: item.fabricBarcode,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        measurementVersion: item.measurementVersion,
        notes: item.notes
      })) : [],
      productionTimeline: order.productionTimeline ? order.productionTimeline.map(pt => ({
        stage: pt.stage,
        timestamp: pt.timestamp
      })) : []
    };

    // Clean Customer Data
    const cleanCustomer = order.customerId ? {
      customerId: order.customerId.customerId,
      fullName: order.customerId.fullName,
      mobile: order.customerId.mobile,
      whatsapp: order.customerId.whatsapp,
      email: order.customerId.email,
      gender: order.customerId.gender,
      dob: order.customerId.dob,
      address: order.customerId.address ? 
        `${order.customerId.address.area || order.customerId.address.street || ''} ${order.customerId.address.city || ''} ${order.customerId.address.state || ''} ${order.customerId.address.pincode || ''}`.trim().replace(/\s+/g, ' ')
        : 'N/A',
      customerSince: order.customerId.createdAt,
      lastVisit: order.customerId.lastVisit,
      category: order.customerId.category,
      loyaltyTier: order.customerId.loyaltyTier,
      vipStatus: order.customerId.vipStatus,
      gstNumber: order.customerId.gstNumber,
      preferredLanguage: order.customerId.preferredLanguage,
      notes: order.customerId.notes,
      tags: order.customerId.tags,
      preferences: order.customerId.preferences,
      imageUrl: order.customerId.imageUrl
    } : null;

    // Clean Invoice Data
    const cleanInvoice = invoice ? {
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate,
      subtotal: invoice.subtotal,
      taxAmount: invoice.taxAmount,
      discountAmount: invoice.discountAmount,
      totalAmount: invoice.totalAmount,
      status: invoice.status,
    } : null;

    // Clean Garments / Measurements Data
    const cleanGarments = garments.map(g => ({
      garmentType: g.garmentType,
      currentVersion: g.version || 1,
      versions: [{
        versionNumber: g.version || 1,
        date: g.updatedAt || g.createdAt,
        measurements: g.measurements || {}
      }]
    }));

    // 5. Fetch Business Settings
    const settings = await Setting.find({}).lean();
    const settingsObj = {};
    settings.forEach(s => {
      settingsObj[s.key] = s.value;
    });

    return sendSuccess(res, 200, 'Secure Payload Loaded', {
      order: cleanOrder,
      customer: cleanCustomer,
      invoice: cleanInvoice,
      garments: cleanGarments,
      settings: settingsObj
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
