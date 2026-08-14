const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { FabricInventory, FabricRoll, StockTransaction, BarcodeHistory, StockHistory, ScanHistory, FabricConsumptionRule } = require('../models/Inventory');
const { Notification } = require('../models/System');
const InventoryService = require('../services/inventoryService');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { sendSuccess, sendError } = require('../utils/response');

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

module.exports = router;

