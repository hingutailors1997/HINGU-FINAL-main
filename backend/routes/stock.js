const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { FabricInventory, FabricRoll, StockTransaction, BarcodeHistory, StockHistory, ScanHistory, FabricConsumptionRule, SupplierBill, Supplier } = require('../models/Inventory');
const { Notification } = require('../models/System');
const Transaction = require('../models/Transaction');
const InventoryService = require('../services/inventoryService');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { sendSuccess, sendError } = require('../utils/response');

// GET all suppliers
router.get('/suppliers', authMiddleware, async (req, res, next) => {
  try {
    // Auto-sync suppliers from FabricInventory (partyName or supplierName)
    const distinctPartyNames = await FabricInventory.distinct('partyName');
    const distinctSupplierNames = await FabricInventory.distinct('supplierName');
    const allFabricNames = [...new Set([...distinctPartyNames, ...distinctSupplierNames])].filter(Boolean);
    const allFabricNamesLower = allFabricNames.map(n => n.trim().toLowerCase());
    
    for (const name of allFabricNames) {
      if (name.trim()) {
        const exists = await Supplier.findOne({ name: new RegExp('^' + name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') });
        if (!exists) {
          await Supplier.create({
            supplierId: `SUP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            name: name.trim()
          });
        }
      }
    }

    // Auto-cleanup: Delete suppliers that no longer have any fabrics
    const allSuppliers = await Supplier.find();
    for (const sup of allSuppliers) {
      if (!allFabricNamesLower.includes(sup.name.trim().toLowerCase())) {
        await Supplier.findByIdAndDelete(sup._id);
      }
    }

    const suppliers = await Supplier.find().sort({ name: 1 });
    return sendSuccess(res, 200, 'Suppliers retrieved', suppliers);
  } catch (err) {
    next(err);
  }
});

// GET latest invoice number for a specific supplier name
router.get('/latest-invoice/:supplierName', authMiddleware, async (req, res, next) => {
  try {
    const nameRegex = new RegExp((req.params.supplierName || '').trim(), 'i');
    const supplier = await Supplier.findOne({ name: nameRegex });
    
    const orConditions = [
      { supplierName: nameRegex },
      { partyName: nameRegex }
    ];
    if (supplier) {
      orConditions.push({ supplierId: supplier._id });
    }

    const fabric = await FabricInventory.findOne({
      $or: orConditions,
      invoiceNumber: { $nin: [null, ''] }
    }).sort('-createdAt');
    
    return sendSuccess(res, 200, 'Latest invoice retrieved', { invoiceNumber: fabric ? fabric.invoiceNumber : '' });
  } catch (err) {
    next(err);
  }
});

// GET all fabric inventory (supports search, category, status, warehouse, sorting, and pagination)
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { search, category, status, warehouse, lowStockOnly, sort = '-createdAt', paginated, page = 1, limit = 50 } = req.query;
    
    const query = {};
    if (search && search.trim() !== '') {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: regex },
        { fabricId: regex },
        { barcode: regex },
        { qrCode: regex },
        { category: regex },
        { color: regex },
        { brand: regex },
        { material: regex },
        { supplierName: regex },
        { warehouse: regex },
        { rackNumber: regex },
        { shelfNumber: regex },
        { lotNumber: regex },
        { rollNumber: regex }
      ];
    }
    if (category && category !== 'All') query.category = category;
    if (status && status !== 'All') query.status = status;
    if (warehouse && warehouse !== 'All') query.warehouse = warehouse;
    if (lowStockOnly === 'true') {
      query.$expr = { $lte: ['$totalAvailable', '$minimumStock'] };
    }

    if (paginated === 'true') {
      const skip = (Number(page) - 1) * Number(limit);
      const fabrics = await FabricInventory.find(query)
        .populate('supplierId', 'name supplierId')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .lean();
        
      const total = await FabricInventory.countDocuments(query);
      const allFabrics = await FabricInventory.find({}, 'totalAvailable purchasePrice minimumStock');
      const totalValue = allFabrics.reduce((sum, f) => sum + ((f.purchasePrice || 0) * (f.totalAvailable || 0)), 0);
      const lowStockCount = allFabrics.filter(f => (f.totalAvailable || 0) <= (f.minimumStock || 10)).length;

      return sendSuccess(res, 200, 'Paginated inventory retrieved', {
        fabrics,
        totalPages: Math.ceil(total / Number(limit)),
        currentPage: Number(page),
        totalFabrics: total,
        totalValue,
        lowStockCount
      });
    }

    const inventory = await FabricInventory.find(query)
      .populate('supplierId', 'name supplierId')
      .sort(sort);
      
    return sendSuccess(res, 200, 'Inventory retrieved successfully', inventory);
  } catch (err) {
    next(err);
  }
});

// GET AI Fabric Consumption prediction helper (MongoDB Configurable Formulas)
router.get('/ai-consumption/predict', authMiddleware, async (req, res, next) => {
  try {
    const { garmentType = 'Shirt', fabricWidth = '58"', fitType = 'Regular', chestInches = 38 } = req.query;
    const prediction = await InventoryService.evaluateAiConsumption(
      String(garmentType), 
      String(fabricWidth), 
      String(fitType), 
      Number(chestInches)
    );
    return sendSuccess(res, 200, 'AI Fabric Consumption calculated', prediction);
  } catch (err) {
    next(err);
  }
});

// GET all configurable AI Fabric Consumption Rules from MongoDB
router.get('/ai-consumption/rules', authMiddleware, async (req, res, next) => {
  try {
    const rules = await FabricConsumptionRule.find().sort({ garmentType: 1 });
    return sendSuccess(res, 200, 'Configurable consumption rules retrieved', rules);
  } catch (err) {
    next(err);
  }
});

// POST create or import new AI Fabric Consumption Rule
router.post('/ai-consumption/rules', authMiddleware, roleMiddleware(['owner', 'manager', 'admin']), async (req, res, next) => {
  try {
    const rule = await FabricConsumptionRule.create(req.body);
    return sendSuccess(res, 201, 'Consumption rule created successfully', rule);
  } catch (err) {
    next(err);
  }
});

// PUT update existing AI Fabric Consumption Rule
router.put('/ai-consumption/rules/:id', authMiddleware, roleMiddleware(['owner', 'manager', 'admin']), async (req, res, next) => {
  try {
    const rule = await FabricConsumptionRule.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!rule) return sendError(res, 404, 'Rule not found');
    return sendSuccess(res, 200, 'Consumption rule updated successfully', rule);
  } catch (err) {
    next(err);
  }
});

// DELETE remove AI Fabric Consumption Rule
router.delete('/ai-consumption/rules/:id', authMiddleware, roleMiddleware(['owner', 'manager', 'admin']), async (req, res, next) => {
  try {
    const rule = await FabricConsumptionRule.findByIdAndDelete(req.params.id);
    if (!rule) return sendError(res, 404, 'Rule not found');
    return sendSuccess(res, 200, 'Consumption rule deleted successfully', rule);
  } catch (err) {
    next(err);
  }
});

// GET All Scan Logs
router.get('/scans/logs', authMiddleware, roleMiddleware(['owner', 'manager', 'admin']), async (req, res, next) => {
  try {
    const logs = await ScanHistory.find().sort({ date: -1 }).limit(100);
    return sendSuccess(res, 200, 'Scan history retrieved successfully', logs);
  } catch (err) {
    next(err);
  }
});

// GET specific fabric inventory by ID, Barcode, or QR Code
router.get('/:id', authMiddleware, async (req, res, next) => {
  if (['bills', 'check-due', 'pay'].includes(req.params.id)) return next('route');
  try {
    const fabric = await InventoryService.findFabric(req.params.id);
    if (!fabric) {
      return sendError(res, 404, 'Fabric inventory record not found');
    }
    const fabricObj = fabric.toObject ? fabric.toObject() : fabric;
    const purchasePrice = Number(fabricObj.purchasePrice || fabricObj.purchasePricePerMeter || fabricObj.pricePerMeter || 0);
    const sellingPrice = Number(fabricObj.sellingPrice || fabricObj.sellingPricePerMeter || fabricObj.pricePerMeter || purchasePrice || 0);
    return sendSuccess(res, 200, 'Fabric details retrieved successfully', {
      ...fabricObj,
      purchasePrice,
      sellingPrice,
      purchasePricePerMeter: purchasePrice,
      sellingPricePerMeter: sellingPrice,
      pricePerMeter: sellingPrice || purchasePrice
    });
  } catch (err) {
    next(err);
  }
});

// POST add new fabric to inventory (auto-generates unique barcode & QR Code)
router.post('/', authMiddleware, roleMiddleware(['owner', 'manager', 'admin', 'store_keeper']), async (req, res, next) => {
  try {
    const savedFabric = await InventoryService.createFabric(req.body, req.user);
    
    await Notification.create({
      userId: req.user?.id || null,
      title: 'New Fabric Added',
      message: `Fabric ${savedFabric.name} (${savedFabric.fabricId}) was added to inventory.`,
      link: `/stock/${savedFabric.fabricId || savedFabric._id}`,
      type: 'Success'
    });

    // Automatic Supplier Bill Generation / Updating
    const invoiceNum = savedFabric.invoiceNumber;
    const supName = savedFabric.supplierName || savedFabric.partyName;
    const amount = (savedFabric.purchasePrice || 0) * (savedFabric.totalAvailable || 0);

    if (invoiceNum && supName && amount > 0) {
      // 1. Find or create supplier
      let supplier = await Supplier.findOne({ name: new RegExp('^' + supName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') });
      if (!supplier) {
        supplier = await Supplier.create({
          supplierId: `SUP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          name: supName.trim()
        });
      }

      // 2. Find existing bill for this invoice + supplier
      let bill = await SupplierBill.findOne({ billNumber: invoiceNum, supplierId: supplier._id });
      
      const advancePay = Number(req.body.amountPaid) || 0;

      if (bill) {
        // Update existing bill
        bill.totalAmount = (bill.totalAmount || 0) + amount;
        bill.amountPaid = (bill.amountPaid || 0) + advancePay;
        if (!bill.fabricItems) bill.fabricItems = [];
        bill.fabricItems.push(savedFabric._id);
        
        // Re-evaluate status just in case
        if (bill.amountPaid >= bill.totalAmount) {
          bill.status = 'Paid';
        } else if (bill.amountPaid > 0) {
          bill.status = 'Partial';
        } else {
          bill.status = 'Unpaid';
        }
        await bill.save();
      } else {
        // Create new bill
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 45); // 45 days from today
        
        await SupplierBill.create({
          billNumber: invoiceNum,
          supplierId: supplier._id,
          billDate: new Date(),
          dueDate: dueDate,
          totalAmount: amount,
          amountPaid: advancePay,
          status: advancePay >= amount ? 'Paid' : (advancePay > 0 ? 'Partial' : 'Unpaid'),
          fabricItems: [savedFabric._id],
          notified: false
        });
      }
    }

    return sendSuccess(res, 201, 'Fabric inventory created with unique Barcode/QR', savedFabric);
  } catch (err) {
    if (err.code === 11000) {
      return sendError(res, 400, 'A fabric with this Barcode or SKU ID already exists in MongoDB.');
    }
    next(err);
  }
});

// PUT update fabric inventory record
router.put('/:id', authMiddleware, roleMiddleware(['owner', 'manager', 'admin', 'store_keeper']), async (req, res, next) => {
  try {
    const fabric = await InventoryService.findFabric(req.params.id);
    if (!fabric) {
      return sendError(res, 404, 'Fabric inventory record not found');
    }
    
    const oldQty = fabric.totalAvailable;
    const updatedFabric = await FabricInventory.findByIdAndUpdate(fabric._id, req.body, { new: true, runValidators: true });
    const newQty = updatedFabric.totalAvailable;

    // Create log for the update
    await StockHistory.create({
      fabricId: updatedFabric._id,
      barcode: updatedFabric.barcode || updatedFabric.fabricId,
      fabricName: updatedFabric.name,
      userId: req.user?.id || null,
      userName: req.user?.name || 'Admin',
      qtyBefore: oldQty,
      qtyChange: newQty - oldQty,
      qtyRemaining: newQty,
      reason: 'Fabric Details Updated',
      deviceUsed: 'Web ERP Dashboard'
    });

    await Notification.create({
      userId: req.user?.id || null,
      title: 'Fabric Updated',
      message: `Fabric ${updatedFabric.name} (${updatedFabric.fabricId}) details were successfully updated.`,
      link: `/stock/${updatedFabric.fabricId || updatedFabric._id}`,
      type: 'Success'
    });

    // Automatically recalculate associated Supplier Bill if present
    if (updatedFabric.invoiceNumber) {
      const bill = await SupplierBill.findOne({ billNumber: updatedFabric.invoiceNumber, fabricItems: updatedFabric._id });
      if (bill) {
        const allFabrics = await FabricInventory.find({ _id: { $in: bill.fabricItems } });
        const newTotal = allFabrics.reduce((sum, f) => sum + ((f.purchasePrice || 0) * (f.totalAvailable || 0)), 0);
        bill.totalAmount = newTotal;
        
        if (bill.amountPaid >= bill.totalAmount) {
          bill.status = 'Paid';
        } else if (bill.amountPaid > 0) {
          bill.status = 'Partial';
        } else {
          bill.status = 'Unpaid';
        }
        await bill.save();
      }
    }

    return sendSuccess(res, 200, 'Fabric inventory updated successfully', updatedFabric);
  } catch (err) {
    next(err);
  }
});

// POST scan barcode (Camera, USB scanner, or QR code scanning)
router.post('/scan', authMiddleware, async (req, res, next) => {
  try {
    const { barcode, device, browser, ip } = req.body;
    if (!barcode) return sendError(res, 400, 'Barcode or QR scan input is required');

    const result = await InventoryService.scanBarcode(barcode, { device, browser, ip: ip || req.ip }, req.user);
    if (!result.found) {
      return sendError(res, 404, `No fabric found matching barcode/QR: ${barcode}`);
    }

    const fabricObj = result.fabric.toObject ? result.fabric.toObject() : result.fabric;
    const purchasePrice = Number(fabricObj.purchasePrice || fabricObj.purchasePricePerMeter || fabricObj.pricePerMeter || 0);
    const sellingPrice = Number(fabricObj.sellingPrice || fabricObj.sellingPricePerMeter || fabricObj.pricePerMeter || purchasePrice || 0);

    return sendSuccess(res, 200, 'Fabric scanned successfully', {
      ...fabricObj,
      purchasePrice,
      sellingPrice,
      purchasePricePerMeter: purchasePrice,
      sellingPricePerMeter: sellingPrice,
      pricePerMeter: sellingPrice || purchasePrice,
      scanAlert: result.alert
    });
  } catch (err) {
    next(err);
  }
});

// POST deduct/use stock (with real-time low stock thresholds)
router.post('/:id/use', authMiddleware, async (req, res, next) => {
  try {
    const { meters, reason, orderNumber, deviceUsed } = req.body;
    const result = await InventoryService.deductStock(req.params.id, meters, reason, orderNumber, deviceUsed, req.user);

    return sendSuccess(res, 200, result.lowStockAlert ? 'Stock deducted! WARNING: Item reached Low Stock threshold.' : 'Stock deducted successfully', {
      fabric: result.fabric,
      history: result.history,
      lowStockAlert: result.lowStockAlert
    });
  } catch (err) {
    return sendError(res, 400, err.message || 'Stock deduction failed');
  }
});

// POST adjust stock (manual reconciliation)
router.post('/:id/adjust', authMiddleware, roleMiddleware(['owner', 'manager', 'admin', 'store_keeper']), async (req, res, next) => {
  try {
    const { qtyChange, reason, deviceUsed } = req.body;
    const result = await InventoryService.adjustStock(req.params.id, qtyChange, reason, deviceUsed, req.user);
    return sendSuccess(res, 200, 'Stock inventory adjusted successfully', {
      fabric: result.fabric,
      history: result.history
    });
  } catch (err) {
    return sendError(res, 400, err.message || 'Stock adjustment failed');
  }
});

// POST reserve fabric stock for orders
router.post('/:id/reserve', authMiddleware, async (req, res, next) => {
  try {
    const { meters, orderId } = req.body;
    const result = await InventoryService.reserveStock(req.params.id, meters, orderId, req.user);
    return sendSuccess(res, 200, 'Fabric reserved successfully', result);
  } catch (err) {
    return sendError(res, 400, err.message);
  }
});

// POST release/unreserve fabric stock
router.post('/:id/unreserve', authMiddleware, async (req, res, next) => {
  try {
    const { meters, orderId } = req.body;
    const result = await InventoryService.releaseReservation(req.params.id, meters, orderId, req.user);
    return sendSuccess(res, 200, 'Fabric reservation released successfully', result);
  } catch (err) {
    return sendError(res, 400, err.message);
  }
});

// POST transfer stock across warehouses / racks
router.post('/:id/transfer', authMiddleware, roleMiddleware(['owner', 'manager', 'admin', 'store_keeper']), async (req, res, next) => {
  try {
    const { targetWarehouse, rackNumber, shelfNumber, reason } = req.body;
    const result = await InventoryService.transferStock(req.params.id, targetWarehouse, rackNumber, shelfNumber, reason, req.user);
    return sendSuccess(res, 200, `Stock relocated to ${result.location}`, result);
  } catch (err) {
    return sendError(res, 400, err.message);
  }
});

// GET Stock History for a fabric
router.get('/:id/history', authMiddleware, async (req, res, next) => {
  try {
    const fabric = await InventoryService.findFabric(req.params.id);
    const identifier = fabric ? fabric.fabricId : req.params.id;
    const history = await StockHistory.find({ 
      $or: [
        { barcode: identifier },
        { fabricId: fabric ? fabric._id : null }
      ] 
    }).sort({ date: -1 });
    return sendSuccess(res, 200, 'Stock history retrieved', history);
  } catch (err) {
    next(err);
  }
});

// POST upload fabric image to gallery
router.post('/:id/gallery', authMiddleware, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) return sendError(res, 400, 'No image file uploaded');
    const fabric = await InventoryService.findFabric(req.params.id);
    if (!fabric) return sendError(res, 404, 'Fabric not found');

    const fileUrl = req.file.path || `/uploads/${req.file.filename}`;
    if (!fabric.imageUrl) fabric.imageUrl = fileUrl;
    fabric.gallery = fabric.gallery || [];
    fabric.gallery.push(fileUrl);

    await fabric.save();
    return sendSuccess(res, 201, 'Fabric gallery image uploaded', fabric);
  } catch (err) {
    next(err);
  }
});

// DELETE remove image from fabric gallery
router.delete('/:id/gallery/:index', authMiddleware, roleMiddleware(['owner', 'manager']), async (req, res, next) => {
  try {
    const fabric = await InventoryService.findFabric(req.params.id);
    if (!fabric || !fabric.gallery) return sendError(res, 404, 'Fabric or gallery not found');

    const idx = Number(req.params.index);
    if (isNaN(idx) || idx < 0 || idx >= fabric.gallery.length) {
      return sendError(res, 400, 'Invalid gallery image index');
    }

    const removedUrl = fabric.gallery.splice(idx, 1)[0];
    if (fabric.imageUrl === removedUrl) {
      fabric.imageUrl = fabric.gallery[0] || null;
    }

    try {
      if (removedUrl && removedUrl.includes('cloudinary')) {
        const cloudinary = require('cloudinary').v2;
        const publicId = removedUrl.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(publicId).catch(() => {});
      }
    } catch (e) { /* ignore cloudinary errors */ }

    await fabric.save();
    return sendSuccess(res, 200, 'Gallery image deleted and cleaned up', fabric);
  } catch (err) {
    next(err);
  }
});

// DELETE remove fabric inventory record and clean associated media assets
router.delete('/:id', authMiddleware, roleMiddleware(['owner', 'manager', 'admin']), async (req, res, next) => {
  try {
    const fabric = await InventoryService.findFabric(req.params.id);
    if (!fabric) return sendSuccess(res, 200, 'Fabric already removed from database');

    // Record immutable deletion history before pruning
    await StockHistory.create({
      fabricId: fabric._id,
      barcode: fabric.barcode || fabric.fabricId,
      fabricName: fabric.name,
      userId: req.user?.id || null,
      userName: req.user?.name || 'Admin / Staff',
      qtyBefore: fabric.totalAvailable,
      qtyChange: -fabric.totalAvailable,
      qtyRemaining: 0,
      reason: 'Permanent Record Deletion & Pruning',
      deviceUsed: 'Web ERP System'
    });

    // Cleanup Cloudinary image assets
    try {
      const cloudinary = require('cloudinary').v2;
      const allUrls = [fabric.imageUrl, ...(fabric.gallery || [])].filter(Boolean);
      for (const url of allUrls) {
        if (url && url.includes('cloudinary')) {
          const publicId = url.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(publicId).catch(() => {});
        }
      }
    } catch (e) { /* ignore cleanup errors */ }

    // Deduct cost from associated SupplierBill and delete bill if empty
    const amountToDeduct = (fabric.purchasePrice || 0) * (fabric.totalAvailable || 0);
    const bills = await SupplierBill.find({ fabricItems: fabric._id });
    
    for (const bill of bills) {
      bill.totalAmount = Math.max(0, (bill.totalAmount || 0) - amountToDeduct);
      bill.fabricItems = bill.fabricItems.filter(id => id.toString() !== fabric._id.toString());
      
      if (bill.totalAmount <= 0 || bill.fabricItems.length === 0) {
        await SupplierBill.findByIdAndDelete(bill._id);
      } else {
        if (bill.amountPaid >= bill.totalAmount) {
          bill.status = 'Paid';
        } else if (bill.amountPaid > 0) {
          bill.status = 'Partial';
        } else {
          bill.status = 'Unpaid';
        }
        await bill.save();
      }
    }

    await FabricInventory.findByIdAndDelete(fabric._id);

    await Notification.create({
      userId: req.user?.id || null,
      title: 'Fabric Deleted',
      message: `Fabric ${fabric.name} (${fabric.fabricId}) was permanently removed.`,
      type: 'Warning'
    });

    return sendSuccess(res, 200, `Fabric '${fabric.name}' has been permanently removed`);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// SUPPLIER BILLS & DUE REMINDERS
// ==========================================

// GET all supplier bills
router.get('/bills', authMiddleware, async (req, res, next) => {
  try {
    const bills = await SupplierBill.find().populate('supplierId').sort('-createdAt');
    return sendSuccess(res, 200, 'Supplier bills retrieved', bills);
  } catch (err) {
    next(err);
  }
});

// POST new supplier bill
router.post('/bills', authMiddleware, async (req, res, next) => {
  try {
    let finalSupplierId = req.body.supplierId;

    // Check if supplierId is a valid ObjectId, if not, it's a new string name.
    if (finalSupplierId && !mongoose.Types.ObjectId.isValid(finalSupplierId)) {
      let supplier = await Supplier.findOne({ name: new RegExp('^' + finalSupplierId.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') });
      if (!supplier) {
        supplier = await Supplier.create({
          supplierId: `SUP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          name: finalSupplierId.trim()
        });
      }
      finalSupplierId = supplier._id;
    }

    const dueDate = new Date(req.body.billDate);
    dueDate.setDate(dueDate.getDate() + 45); // Add 45 days

    const bill = new SupplierBill({
      ...req.body,
      supplierId: finalSupplierId,
      dueDate,
      status: req.body.amountPaid >= req.body.totalAmount ? 'Paid' : (req.body.amountPaid > 0 ? 'Partial' : 'Unpaid')
    });
    await bill.save();
    
    return sendSuccess(res, 201, 'Supplier bill recorded', bill);
  } catch (err) {
    next(err);
  }
});

// DELETE a supplier bill
router.delete('/bills/:id', authMiddleware, roleMiddleware(['owner', 'manager', 'admin']), async (req, res, next) => {
  try {
    const bill = await SupplierBill.findByIdAndDelete(req.params.id);
    if (!bill) return sendError(res, 404, 'Bill not found');
    
    // Also remove this bill from any associated fabric records (optional safety cleanup)
    await FabricInventory.updateMany(
      { _id: { $in: bill.fabricItems } },
      { $unset: { invoiceNumber: "" } }
    );

    return sendSuccess(res, 200, 'Supplier bill permanently deleted');
  } catch (err) {
    next(err);
  }
});

// PUT pay a supplier bill
router.post('/bills/:id/pay', authMiddleware, async (req, res, next) => {
  try {
    const bill = await SupplierBill.findById(req.params.id).populate('supplierId');
    if (!bill) return sendError(res, 404, 'Bill not found');

    const paymentAmount = Number(req.body.paymentAmount) || 0;
    bill.amountPaid += paymentAmount;
    
    if (bill.amountPaid >= bill.totalAmount) {
      bill.status = 'Paid';
    } else if (bill.amountPaid > 0) {
      bill.status = 'Partial';
    }

    await bill.save();

    // Create an Expense Transaction in Accounts Ledger
    const tx = new Transaction({
      transactionNumber: `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: 'Expense',
      amount: paymentAmount,
      category: 'Fabric Purchase',
      paymentMethod: req.body.paymentMethod || 'Bank Transfer',
      description: `Payment for Supplier Bill #${bill.billNumber} (${bill.supplierId ? bill.supplierId.name : 'Unknown'})`,
    });
    await tx.save();

    return sendSuccess(res, 200, 'Bill payment recorded successfully', bill);
  } catch (err) {
    next(err);
  }
});

// GET check and generate notifications for bills due in <= 7 days
router.get('/bills/check-due', authMiddleware, async (req, res, next) => {
  try {
    const now = new Date();
    const threshold = new Date();
    threshold.setDate(now.getDate() + 7); // 7 days from now

    const dueBills = await SupplierBill.find({
      status: { $in: ['Unpaid', 'Partial'] },
      dueDate: { $lte: threshold },
      notified: false
    }).populate('supplierId');

    const notifications = [];
    for (const bill of dueBills) {
      // Create notification for admin
      const notification = new Notification({
        userId: req.user ? req.user.id : null, // Fallback if no user context but ideally requires admin ID
        title: 'Bill Payment Due Reminder',
        message: `Supplier Bill #${bill.billNumber} from ${bill.supplierId ? bill.supplierId.name : 'Unknown'} for ₹${bill.totalAmount} is due on ${bill.dueDate.toLocaleDateString()}.`,
        type: 'Warning',
        link: '/stock'
      });
      await notification.save();
      notifications.push(notification);

      bill.notified = true;
      if (bill.dueDate < now) {
        bill.status = 'Overdue';
      }
      await bill.save();
    }

    // Also check for already notified bills that just became overdue
    const overdueBills = await SupplierBill.find({
      status: { $in: ['Unpaid', 'Partial'] },
      dueDate: { $lt: now },
      notified: true
    });
    for (const bill of overdueBills) {
      bill.status = 'Overdue';
      await bill.save();
    }

    return sendSuccess(res, 200, 'Due bills checked and notifications created', { notifiedCount: notifications.length });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

