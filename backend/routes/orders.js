const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { Order, OrderItem, OrderWorkflowStage } = require('../models/Order');
const { FabricInventory } = require('../models/Inventory');
const { Customer } = require('../models/CRM');
const Transaction = require('../models/Transaction');
const InventoryService = require('../services/inventoryService');
const { Invoice } = require('../models/Finance');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { sendSuccess, sendError } = require('../utils/response');

// Default 12 workflow stages as defined in Phase 4 specifications
const DEFAULT_WORKFLOW_STAGES = [
  { stageName: 'Order Created', orderIndex: 1, color: '#3B82F6', icon: 'FileText', isDefaultStart: true },
  { stageName: 'Measurements Verified', orderIndex: 2, color: '#06B6D4', icon: 'CheckSquare' },
  { stageName: 'Fabric Allocated', orderIndex: 3, color: '#8B5CF6', icon: 'Package' },
  { stageName: 'Cutting', orderIndex: 4, color: '#D97706', icon: 'Scissors', permissions: ['owner', 'admin', 'manager', 'tailor'] },
  { stageName: 'Stitching', orderIndex: 5, color: '#EC4899', icon: 'Layers', permissions: ['owner', 'admin', 'manager', 'tailor'] },
  { stageName: 'Embroidery', orderIndex: 6, color: '#F43F5E', icon: 'Sparkles', permissions: ['owner', 'admin', 'manager', 'tailor'] },
  { stageName: 'Quality Check', orderIndex: 7, color: '#10B981', icon: 'ShieldCheck', permissions: ['owner', 'admin', 'manager', 'store_keeper'] },
  { stageName: 'Trial', orderIndex: 8, color: '#6366F1', icon: 'UserCheck' },
  { stageName: 'Alteration', orderIndex: 9, color: '#F97316', icon: 'RefreshCw', permissions: ['owner', 'admin', 'manager', 'tailor'] },
  { stageName: 'Ready', orderIndex: 10, color: '#14B8A6', icon: 'Bag' },
  { stageName: 'Delivered', orderIndex: 11, color: '#22C55E', icon: 'Truck', isDefaultEnd: true },
  { stageName: 'Completed', orderIndex: 12, color: '#64748B', icon: 'CheckCircle', isDefaultEnd: true }
];

// Helper to auto-seed stages if collection is empty
async function ensureWorkflowStages() {
  const count = await OrderWorkflowStage.countDocuments();
  if (count === 0) {
    await OrderWorkflowStage.insertMany(DEFAULT_WORKFLOW_STAGES);
  }
}

// ==========================================
// CONFIGURABLE WORKFLOW STAGE ENDPOINTS
// ==========================================

// GET all configured workflow stages
router.get('/stages', authMiddleware, async (req, res, next) => {
  try {
    await ensureWorkflowStages();
    const stages = await OrderWorkflowStage.find({ isDisabled: false }).sort({ orderIndex: 1 });
    return sendSuccess(res, 200, 'Workflow stages retrieved successfully', stages);
  } catch (err) {
    next(err);
  }
});

// GET all stages including disabled ones (for Admin configuration panel)
router.get('/stages/all', authMiddleware, roleMiddleware(['owner', 'admin', 'manager']), async (req, res, next) => {
  try {
    await ensureWorkflowStages();
    const stages = await OrderWorkflowStage.find().sort({ orderIndex: 1 });
    return sendSuccess(res, 200, 'All workflow stages retrieved', stages);
  } catch (err) {
    next(err);
  }
});

// POST Add a new stage without code changes
router.post('/stages', authMiddleware, roleMiddleware(['owner', 'admin', 'manager']), async (req, res, next) => {
  try {
    const { stageName, orderIndex, color, icon, permissions, description } = req.body;
    if (!stageName || orderIndex === undefined) {
      return sendError(res, 400, 'stageName and orderIndex are required');
    }
    const stage = await OrderWorkflowStage.create({ stageName, orderIndex, color, icon, permissions, description });
    return sendSuccess(res, 201, 'New workflow stage added', stage);
  } catch (err) {
    if (err.code === 11000) return sendError(res, 409, 'Stage name already exists');
    next(err);
  }
});

// PUT Modify, rename, or reorder a workflow stage
router.put('/stages/:id', authMiddleware, roleMiddleware(['owner', 'admin', 'manager']), async (req, res, next) => {
  try {
    const stage = await OrderWorkflowStage.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!stage) return sendError(res, 404, 'Workflow stage not found');
    return sendSuccess(res, 200, 'Workflow stage updated', stage);
  } catch (err) {
    next(err);
  }
});

// DELETE / Disable a stage
router.delete('/stages/:id', authMiddleware, roleMiddleware(['owner', 'admin', 'manager']), async (req, res, next) => {
  try {
    // Soft disable instead of deleting if orders depend on it
    const stage = await OrderWorkflowStage.findByIdAndUpdate(req.params.id, { isDisabled: true }, { new: true });
    if (!stage) return sendError(res, 404, 'Workflow stage not found');
    return sendSuccess(res, 200, 'Workflow stage disabled gracefully', stage);
  } catch (err) {
    next(err);
  }
});

// POST restore default workflow stages (Admin/Owner only)
router.post('/stages/restore-defaults', authMiddleware, roleMiddleware(['owner', 'admin']), async (req, res, next) => {
  try {
    await OrderWorkflowStage.deleteMany({});
    const stages = await OrderWorkflowStage.insertMany(DEFAULT_WORKFLOW_STAGES);
    return sendSuccess(res, 200, 'Default workflow pipeline restored successfully', stages);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// TAILOR WORKFLOW & MONITORING ENDPOINTS
// ==========================================

// GET Tailor Workload summary (Section 18 requirement)
router.get('/tailor-workload', authMiddleware, async (req, res, next) => {
  try {
    const { tailorId } = req.query;
    const matchQuery = tailorId ? { assignedTailorId: new mongoose.Types.ObjectId(tailorId) } : {};

    const orders = await Order.find(matchQuery)
      .select('-totalAmount -balanceAmount -advancePaid -payments -discount -tax -invoice -items.unitPrice -items.totalPrice -items.accessories.unitCost')
      .populate('customerId', 'firstName lastName mobile')
      .populate('assignedTailorId', 'name email role')
      .sort({ dueDate: 1 });

    const summary = {
      totalAssigned: orders.length,
      pendingCutting: orders.filter(o => o.currentStage === 'Cutting' || o.currentStage === 'Fabric Allocated').length,
      inStitching: orders.filter(o => ['Stitching', 'Embroidery', 'Alteration'].includes(o.currentStage)).length,
      completedToday: orders.filter(o => ['Ready', 'Delivered', 'Completed'].includes(o.currentStage)).length,
      delayedOrders: orders.filter(o => o.dueDate && new Date(o.dueDate) < new Date() && !['Delivered', 'Completed'].includes(o.currentStage)).length,
      orders
    };

    return sendSuccess(res, 200, 'Tailor workload summary computed', summary);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// ORDER LIFECYCLE ENDPOINTS
// ==========================================

// GET all orders (supports search, stage filtering, pagination, and sorting)
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { search, stage, priority, tailorId, customerId, page = 1, limit = 50, sort = '-orderDate' } = req.query;
    
    const query = {};
    if (search && search.trim() !== '') {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { orderNumber: regex },
        { customerName: regex },
        { customerPhone: regex },
        { barcode: regex },
        { qrCode: regex }
      ];
    }
    if (stage && stage !== 'All') query.currentStage = stage;
    if (priority && priority !== 'All') query.priority = priority;
    if (tailorId) query.assignedTailorId = tailorId;
    if (customerId) query.customerId = customerId;

    const totalOrders = await Order.countDocuments(query);
    const skip = (Number(page) - 1) * Number(limit);
    
    const orders = await Order.find(query)
      .populate('customerId', 'fullName mobile email')
      .populate('companyGroupId', 'groupName phone')
      .populate('assignedTailorId', 'name email role')
      .populate('items.employeeId', 'fullName mobile')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    return sendSuccess(res, 200, 'Orders retrieved successfully', {
      orders,
      totalOrders,
      totalPages: Math.ceil(totalOrders / Number(limit)),
      currentPage: Number(page)
    });
  } catch (err) {
    next(err);
  }
});

// GET single order by ID or orderNumber or barcode
router.get('/:idOrBarcode', authMiddleware, async (req, res, next) => {
  try {
    const { idOrBarcode } = req.params;
    let query = { orderNumber: idOrBarcode };
    if (mongoose.Types.ObjectId.isValid(idOrBarcode)) {
      query = { $or: [{ _id: idOrBarcode }, { orderNumber: idOrBarcode }, { barcode: idOrBarcode }] };
    } else {
      query = { $or: [{ orderNumber: idOrBarcode }, { barcode: idOrBarcode }, { qrCode: idOrBarcode }] };
    }

    const order = await Order.findOne(query)
      .populate('customerId')
      .populate('companyGroupId')
      .populate('items.employeeId', 'fullName firstName lastName mobile')
      .populate('assignedTailorId', 'name email role')
      .populate('items.fabricId');
    if (!order) return sendError(res, 404, 'Order not found');
    return sendSuccess(res, 200, 'Order profile loaded', order);
  } catch (err) {
    next(err);
  }
});

// GET generated invoice PDF for an order
router.get('/:id/invoice', authMiddleware, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).select('orderNumber invoice');
    if (!order) return sendError(res, 404, 'Order not found');

    const invoice = await Invoice.findOne({ orderId: order._id });
    if (!invoice || !invoice.pdfData) return sendError(res, 404, 'Invoice PDF not found for this order');

    res.setHeader('Content-Type', invoice.pdfMimeType || 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber || order.orderNumber}.pdf"`);
    return res.send(invoice.pdfData);
  } catch (err) {
    next(err);
  }
});

// POST generate or retrieve shareable link for WhatsApp
router.post('/:id/share', authMiddleware, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate('customerId', 'firstName lastName mobile');
    if (!order) return sendError(res, 404, 'Order not found');

    let token = order.shareToken;
    if (!token) {
      const crypto = require('crypto');
      token = crypto.randomBytes(12).toString('hex');
      order.shareToken = token;
      
      order.auditLog.push({
        action: 'SHARE_LINK_GENERATED',
        userId: req.user?.id,
        userName: req.user?.name || 'Staff',
        details: 'Generated secure public sharing link'
      });
      await order.save();
    }

    let clientUrl = 'https://hingutailors.vercel.app';
    const shareUrl = `${clientUrl}/share/${token}`;
    
    const customerName = order.customerName || order.customerId?.firstName || 'Customer';
    const message = `Hello ${customerName},

Thank you for choosing Hingu Tailors.

Your order documents are ready.

You can securely access them using the link below:

${shareUrl}

The page contains:
📄 Customer Details
📦 Order Details
🧾 Invoice / Bill

Thank you,
HINGU TAILORS`;

    const rawNumber = order.customerId?.whatsapp || order.customerId?.mobile || order.customerPhone;
    let phone = rawNumber ? String(rawNumber).replace(/\D/g, '') : null;
    if (phone && phone.length === 10) {
      phone = '91' + phone;
    }

    return sendSuccess(res, 200, 'Share link generated', {
      token,
      shareUrl,
      whatsappText: message,
      phone
    });
  } catch (err) {
    next(err);
  }
});

// POST create new order with automated fabric reservation and transaction logging
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    await ensureWorkflowStages();
    const count = await Order.countDocuments();
    const orderNumber = `ORD-${8000 + count + 1}`;
    const barcode = `99000${8000 + count + 1}`;
    const qrCode = `https://hingu-erp.local/orders/${orderNumber}`;

    const totalAmount = Number(req.body.totalAmount) || 0;
    const advancePaid = Number(req.body.advancePaid) || 0;
    const balanceAmount = totalAmount - (Number(req.body.discount) || 0) - advancePaid;

    let clientEntity;
    if (req.body.companyGroupId) {
      const CustomerGroup = require('../models/CustomerGroup');
      clientEntity = await CustomerGroup.findById(req.body.companyGroupId);
      if (!clientEntity) return sendError(res, 404, 'Corporate Group record required to initiate this order');
    } else {
      clientEntity = await Customer.findById(req.body.customerId);
      if (!clientEntity) return sendError(res, 404, 'Customer record required to initiate an order');
    }

    const initialStage = (await OrderWorkflowStage.findOne({ isDefaultStart: true }))?.stageName || 'Order Created';

    const newOrder = new Order({
      ...req.body,
      orderNumber,
      barcode,
      qrCode,
      customerName: clientEntity.fullName || clientEntity.groupName || 'Unknown',
      customerPhone: clientEntity.mobile || clientEntity.phone,
      totalAmount,
      advancePaid,
      balanceAmount,
      currentStage: initialStage,
      createdBy: req.user?.id,
      createdByName: req.user?.name || 'Staff',
      productionTimeline: [{
        stage: initialStage,
        timestamp: new Date(),
        performedBy: req.user?.name || 'Staff',
        notes: 'Order initiated via POS Terminal'
      }],
      auditLog: [{
        action: 'ORDER_CREATED',
        userId: req.user?.id,
        userName: req.user?.name || 'Staff',
        details: `Created order #${orderNumber} with total value ₹${totalAmount}`
      }]
    });

    const savedOrder = await newOrder.save();

    // Securely Reserve or Deduct assigned fabric stock using our Atomic InventoryService
    if (savedOrder.items && savedOrder.items.length > 0) {
      for (const item of savedOrder.items) {
        if (item.fabricId && item.fabricMeterageUsed > 0 && !item.fabricProvidedByCustomer) {
          try {
            const result = await InventoryService.deductStock(
              item.fabricId, 
              item.fabricMeterageUsed, 
              `Cut for Order ${orderNumber} (${item.garmentType})`, 
              orderNumber, 
              'Order POS Module', 
              { id: req.user?.id, name: req.user?.name }
            );
            
            savedOrder.fabricAllocation.push({
              fabricId: item.fabricId,
              barcode: result?.fabric?.fabricId || item.fabricBarcode || 'N/A',
              fabricName: result?.fabric?.name || 'Assigned Fabric',
              metersReserved: item.fabricMeterageUsed,
              metersDeducted: item.fabricMeterageUsed,
              status: 'Cut & Deducted'
            });
            savedOrder.auditLog.push({
              action: 'FABRIC_ALLOCATED',
              userId: req.user?.id,
              userName: req.user?.name || 'Staff',
              details: `Allocated & deducted ${item.fabricMeterageUsed}m of fabric (${item.fabricId}) for order #${orderNumber}`
            });
          } catch (stockErr) {
            console.warn(`[Order Onboard Warning] Could not deduct fabric stock automatically: ${stockErr.message}`);
          }
        }
      }
      if (savedOrder.fabricAllocation.length > 0) {
        await savedOrder.save();
      }
    }

    // Update Customer CRM totals
    await Customer.findByIdAndUpdate(savedOrder.customerId, {
      $inc: {
        totalOrders: 1,
        totalRevenue: totalAmount,
        pendingBalance: balanceAmount
      }
    });

    // Generate Financial Transaction if Advance was paid
    if (advancePaid > 0) {
      const tx = new Transaction({
        type: 'Income',
        amount: advancePaid,
        category: 'Order Advance Payment',
        paymentMethod: req.body.paymentMethod || 'UPI',
        description: `Advance collected for ${orderNumber} (${clientEntity.firstName || clientEntity.fullName || clientEntity.groupName || 'Customer'})`,
        orderRef: savedOrder._id
      });
      await tx.save();
    }

    return sendSuccess(res, 201, 'Order created and scheduled successfully', savedOrder);
  } catch (err) {
    if (err.code === 11000) return sendError(res, 409, 'Duplicate Order Number or Barcode collision occurred');
    next(err);
  }
});

// PUT advance or alter order stage (Configurable Workflow Transition)
router.put('/:id/stage', authMiddleware, async (req, res, next) => {
  try {
    const { stageName, notes = 'Stage transition updated' } = req.body;
    if (!stageName) return sendError(res, 400, 'Target stageName is required');

    const stageConfig = await OrderWorkflowStage.findOne({ stageName, isDisabled: false });
    if (!stageConfig) return sendError(res, 404, `Stage "${stageName}" is not a valid active workflow step in MongoDB`);

    // Verify role permissions for this stage transition if configured
    if (stageConfig.permissions && stageConfig.permissions.length > 0) {
      const userRole = req.user?.role || 'tailor';
      if (!stageConfig.permissions.includes(userRole) && !['owner', 'admin'].includes(userRole)) {
        return sendError(res, 403, `Forbidden: Your role (${userRole}) is not authorized to transition orders into [${stageName}] stage.`);
      }
    }

    const order = await Order.findById(req.params.id);
    if (!order) return sendError(res, 404, 'Order not found');

    const previousStage = order.currentStage;
    order.currentStage = stageName;

    // Record production timeline transition
    order.productionTimeline.push({
      stage: stageName,
      timestamp: new Date(),
      performedBy: req.user?.name || 'Staff',
      notes: `${notes} (Transited from ${previousStage})`
    });

    order.auditLog.push({
      action: 'STAGE_TRANSITION',
      userId: req.user?.id,
      userName: req.user?.name || 'Staff',
      details: `Moved order from [${previousStage}] to [${stageName}]`
    });

    // If transitioned to Delivered or Completed, finalize completion dates
    if (stageConfig.isDefaultEnd && !order.deliveryDate) {
      order.deliveryDate = new Date();

      // Auto-create an Invoice record if none exists for this order
      try {
        const existingInv = await Invoice.findOne({ orderId: order._id });
        if (!existingInv) {
          const invCount = await Invoice.countDocuments();
          const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invCount + 1).padStart(3, '0')}`;
          const subtotal = Number(order.totalAmount || 0);
          const taxAmount = Number(order.tax || 0);
          const discountAmount = Number(order.discount || 0);
          const totalAmount = subtotal - discountAmount + taxAmount;

          const newInv = await Invoice.create({
            invoiceNumber,
            orderId: order._id,
            customerId: order.customerId,
            issueDate: new Date(),
            dueDate: order.deliveryDate,
            subtotal,
            taxAmount,
            discountAmount,
            totalAmount,
            status: 'Issued'
          });

          // No longer generating PDF on backend to save MongoDB storage and improve speed.
          // PDF generation is handled dynamically on the client-side.
          order.invoice = { number: invoiceNumber, url: '' };
        }
      } catch (invErr) {
        console.error('Auto-invoice generation failed', invErr);
      }
    }

    await order.save();
    return sendSuccess(res, 200, `Order stage transitioned to [${stageName}]`, order);
  } catch (err) {
    next(err);
  }
});

// POST Record Alteration request & revert to Alteration stage
router.post('/:id/alteration', authMiddleware, async (req, res, next) => {
  try {
    const { notes } = req.body;
    if (!notes) return sendError(res, 400, 'Alteration notes and instructions are required');

    const order = await Order.findById(req.params.id);
    if (!order) return sendError(res, 404, 'Order not found');

    order.alterationHistory.push({
      date: new Date(),
      notes,
      performedBy: req.user?.name || 'Staff',
      resolved: false
    });

    // Auto switch stage to Alteration if stage exists
    const altStage = await OrderWorkflowStage.findOne({ stageName: /Alteration/i });
    if (altStage) {
      order.currentStage = altStage.stageName;
      order.productionTimeline.push({
        stage: altStage.stageName,
        timestamp: new Date(),
        performedBy: req.user?.name || 'Staff',
        notes: `Alteration triggered: ${notes}`
      });
    }

    await order.save();
    return sendSuccess(res, 201, 'Alteration logged and assigned to Tailor queue', order);
  } catch (err) {
    next(err);
  }
});

// PUT update order details
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const totalAmount = Number(req.body.totalAmount) || 0;
    const advancePaid = Number(req.body.advancePaid) || 0;
    const balanceAmount = totalAmount - (Number(req.body.discount) || 0) - advancePaid;
    
    // Check old order to record any newly added payments into the ledger
    const oldOrder = await Order.findById(req.params.id).populate('customerId', 'firstName lastName');
    if (!oldOrder) return sendError(res, 404, 'Order not found');
    
    const oldAdvance = oldOrder.advancePaid || 0;
    const paymentDiff = advancePaid - oldAdvance;

    const order = await Order.findByIdAndUpdate(req.params.id, {
      ...req.body,
      totalAmount,
      advancePaid,
      balanceAmount
    }, { new: true });
    
    // Generate Financial Transaction if extra payment was collected
    if (paymentDiff > 0) {
      const customerName = oldOrder.customerId ? oldOrder.customerId.firstName : 'Customer';
      const tx = new Transaction({
        type: 'Income',
        amount: paymentDiff,
        category: 'Order Payment',
        paymentMethod: req.body.paymentMethod || 'UPI',
        description: `Payment collected for ${oldOrder.orderNumber} (${customerName})`,
        orderRef: oldOrder._id,
        customerRef: oldOrder.customerId ? oldOrder.customerId._id : undefined
      });
      await tx.save();
      
      // Update Customer pendingBalance if customer is linked
      if (oldOrder.customerId) {
        await Customer.findByIdAndUpdate(oldOrder.customerId._id, {
          $inc: { pendingBalance: -paymentDiff }
        });
      }
    }
    
    return sendSuccess(res, 200, 'Order updated successfully', order);
  } catch (err) {
    next(err);
  }
});

// DELETE remove order (Admin/Owner only)
router.delete('/:id', authMiddleware, roleMiddleware(['owner', 'admin', 'manager']), async (req, res, next) => {
  try {
    const query = mongoose.Types.ObjectId.isValid(req.params.id)
      ? { $or: [{ _id: req.params.id }, { orderNumber: req.params.id }] }
      : { orderNumber: req.params.id };
      
    const order = await Order.findOneAndDelete(query);
    if (!order) return sendSuccess(res, 200, 'Order already removed from database');
    
    // Clean up associated OrderItem documents
    if (OrderItem) {
      await OrderItem.deleteMany({ orderId: order._id }).catch(() => {});
    }
    
    return sendSuccess(res, 200, 'Order and related items removed from database', order);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
