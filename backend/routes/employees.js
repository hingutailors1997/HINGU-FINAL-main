const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { Employee, DailyWorkLog, Salary, Attendance, Payment, RateMaster } = require('../models/HR');
const { authMiddleware } = require('../middleware/auth');

// ==================== RATE MASTER ENDPOINTS ====================

// GET all rate masters (with optional auto-seed of default Hingu tailoring rates)
router.get('/ratemaster', authMiddleware, async (req, res) => {
  try {
    const rates = await RateMaster.find().sort({ category: 1, garmentName: 1, variant: 1 });
    
    // Auto-migrate legacy data
    let modified = false;
    for (let r of rates) {
      if (r.rate != null && (r.defaultSellingPrice == null || r.defaultSellingPrice === 0) && (r.employeePieceRate == null || r.employeePieceRate === 0)) {
        r.defaultSellingPrice = r.rate * 2; // Rough example, user will adjust
        r.employeePieceRate = r.rate;
        r.history.forEach(h => {
          if (h.rate != null && h.defaultSellingPrice == null && h.employeePieceRate == null) {
            h.defaultSellingPrice = h.rate * 2;
            h.employeePieceRate = h.rate;
          }
        });
        await r.save();
        modified = true;
      }
    }
    
    if (modified) {
      const updatedRates = await RateMaster.find().sort({ category: 1, garmentName: 1, variant: 1 });
      return res.json(updatedRates);
    }

    res.json(rates);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch rate master table', error: err.message });
  }
});

// GET active rate lookup (Reusable service method for Daily Work Logs in Phase 2)
router.get('/ratemaster/lookup', authMiddleware, async (req, res) => {
  try {
    const { category, garmentName, variant, workType } = req.query;
    const query = { status: 'Active' };
    if (category) query.category = { $regex: new RegExp(`^${category}$`, 'i') };
    if (garmentName) query.garmentName = { $regex: new RegExp(`^${garmentName}$`, 'i') };
    if (variant) query.variant = { $regex: new RegExp(`^${variant}$`, 'i') };
    if (workType) query.workType = { $regex: new RegExp(`^${workType}$`, 'i') };

    const rateItem = await RateMaster.findOne(query).sort({ effectiveDate: -1 });
    if (!rateItem) {
      return res.json({ success: true, found: false, defaultSellingPrice: 0, employeePieceRate: 0, message: 'No active rate matched these specifications.' });
    }
    return res.json({ success: true, found: true, defaultSellingPrice: rateItem.defaultSellingPrice, employeePieceRate: rateItem.employeePieceRate, rateMasterId: rateItem._id, garmentName: rateItem.garmentName, workType: rateItem.workType, effectiveDate: rateItem.effectiveDate });
  } catch (err) {
    res.status(500).json({ message: 'Rate lookup service failed', error: err.message });
  }
});

// POST import rates from Excel/CSV (Array of rate objects)
router.post('/ratemaster/import', authMiddleware, async (req, res) => {
  try {
    const rates = Array.isArray(req.body) ? req.body : (req.body.rates || []);
    if (rates.length === 0) return res.status(400).json({ message: 'No rates provided for import' });
    
    const importItems = rates.map(item => ({
      category: item.category || 'Custom',
      garmentName: item.garmentName || item.garment || 'Imported Garment',
      variant: item.variant || 'Standard',
      workType: item.workType || 'Stitching',
      defaultSellingPrice: Number(item.defaultSellingPrice) || 0,
      employeePieceRate: Number(item.employeePieceRate) || 0,
      effectiveDate: item.effectiveDate ? new Date(item.effectiveDate) : new Date(),
      status: item.status || 'Active',
      remarks: item.remarks || 'Imported via Excel',
      createdBy: 'Owner/Admin',
      history: [{
        defaultSellingPrice: Number(item.defaultSellingPrice) || 0,
        employeePieceRate: Number(item.employeePieceRate) || 0,
        effectiveDate: item.effectiveDate ? new Date(item.effectiveDate) : new Date(),
        status: item.status || 'Active',
        action: 'Imported from Excel/CSV',
        changedBy: 'Owner/Admin'
      }]
    }));

    await RateMaster.insertMany(importItems);
    res.status(201).json({ success: true, message: `Successfully imported ${importItems.length} rate records.` });
  } catch (err) {
    res.status(400).json({ message: 'Import failed', error: err.message });
  }
});

// POST create rate
router.post('/ratemaster', authMiddleware, async (req, res) => {
  try {
    const defaultSellingPrice = Number(req.body.defaultSellingPrice) || 0;
    const employeePieceRate = Number(req.body.employeePieceRate) || 0;
    const effDate = req.body.effectiveDate ? new Date(req.body.effectiveDate) : new Date();
    const newRate = new RateMaster({
      ...req.body,
      defaultSellingPrice,
      employeePieceRate,
      effectiveDate: effDate,
      createdBy: 'Owner/Admin',
      history: [{
        defaultSellingPrice,
        employeePieceRate,
        effectiveDate: effDate,
        status: req.body.status || 'Active',
        remarks: req.body.remarks,
        changedBy: 'Owner/Admin',
        changedAt: new Date(),
        action: 'Rate created'
      }]
    });
    await newRate.save();
    res.status(201).json(newRate);
  } catch (err) {
    res.status(400).json({ message: 'Bad Request', error: err.message });
  }
});

// PUT update rate (preserves history snapshot of changes without mutating old logs)
router.put('/ratemaster/:id', authMiddleware, async (req, res) => {
  try {
    const record = await RateMaster.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Rate record not found' });

    const newSellPrice = req.body.defaultSellingPrice !== undefined ? Number(req.body.defaultSellingPrice) : record.defaultSellingPrice;
    const newEmpRate = req.body.employeePieceRate !== undefined ? Number(req.body.employeePieceRate) : record.employeePieceRate;
    const newStatus = req.body.status || record.status;
    const newEffDate = req.body.effectiveDate ? new Date(req.body.effectiveDate) : record.effectiveDate;
    
    // Check if key billing parameters changed to log in audit history
    if (newSellPrice !== record.defaultSellingPrice || newEmpRate !== record.employeePieceRate || newStatus !== record.status || req.body.variant !== record.variant) {
      record.history.push({
        defaultSellingPrice: newSellPrice,
        employeePieceRate: newEmpRate,
        effectiveDate: newEffDate,
        status: newStatus,
        remarks: req.body.remarks || record.remarks,
        changedBy: 'Owner/Admin',
        changedAt: new Date(),
        action: (newSellPrice !== record.defaultSellingPrice || newEmpRate !== record.employeePieceRate) ? `Rates updated` : `Rate specifications updated`
      });
    }

    Object.assign(record, req.body, { defaultSellingPrice: newSellPrice, employeePieceRate: newEmpRate, effectiveDate: newEffDate, status: newStatus });
    await record.save();
    res.json(record);
  } catch (err) {
    res.status(400).json({ message: 'Update failed', error: err.message });
  }
});

// PUT toggle status
router.put('/ratemaster/:id/toggle-status', authMiddleware, async (req, res) => {
  try {
    const record = await RateMaster.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Rate record not found' });

    record.status = record.status === 'Active' ? 'Inactive' : 'Active';
    record.history.push({
      defaultSellingPrice: record.defaultSellingPrice,
      employeePieceRate: record.employeePieceRate,
      effectiveDate: record.effectiveDate,
      status: record.status,
      remarks: `Status toggled to ${record.status}`,
      changedBy: 'Owner/Admin',
      changedAt: new Date(),
      action: `Status toggled to ${record.status}`
    });

    await record.save();
    res.json(record);
  } catch (err) {
    res.status(400).json({ message: 'Status change failed', error: err.message });
  }
});

// DELETE rate
router.delete('/ratemaster/:id', authMiddleware, async (req, res) => {
  try {
    const record = await RateMaster.findByIdAndDelete(req.params.id);
    if (!record) return res.json({ success: true, message: 'Record already removed' });
    res.json({ success: true, message: 'Rate record removed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete rate', error: err.message });
  }
});

// ==================== EMPLOYEE DIRECTORY ENDPOINTS ====================

// GET all employees
router.get('/', authMiddleware, async (req, res) => {
  try {
    const employees = await Employee.find().sort({ createdAt: -1 });
    res.json(employees);
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// POST create employee
router.post('/', authMiddleware, async (req, res) => {
  try {
    const count = await Employee.countDocuments();
    const employeeId = `EMP-${1000 + count + 1}`;
    const newEmp = new Employee({ ...req.body, employeeId });
    await newEmp.save();
    res.status(201).json(newEmp);
  } catch (err) {
    res.status(400).json({ message: 'Bad Request', error: err.message });
  }
});

// GET all daily work logs across employees (with employee details and rate snapshot)
router.get('/worklogs/all', authMiddleware, async (req, res) => {
  try {
    const logs = await DailyWorkLog.find().populate('employeeId', 'firstName lastName employeeId role').sort({ date: -1, createdAt: -1 }).limit(300);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch all work logs', error: err.message });
  }
});

// GET all piece-rate payments across all employees
router.get('/payments/all', authMiddleware, async (req, res) => {
  try {
    const payments = await Payment.find().populate('employeeId', 'firstName lastName employeeId role').sort({ createdAt: -1, paymentPeriodStart: -1 }).limit(300);
    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch payments', error: err.message });
  }
});

// GET single employee with history
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const query = mongoose.Types.ObjectId.isValid(req.params.id)
      ? { $or: [{ _id: req.params.id }, { employeeId: req.params.id }] }
      : { employeeId: req.params.id };
    const employee = await Employee.findOne(query);
    if (!employee) return res.status(404).json({ message: 'Not found' });
    
    const workLogs = await DailyWorkLog.find({ employeeId: employee._id }).sort({ date: -1 }).limit(500);
    const salaries = await Salary.find({ employeeId: employee._id }).sort({ year: -1, month: -1 });
    const attendance = await Attendance.find({ employeeId: employee._id }).sort({ date: -1 }).limit(50);
    const payments = await Payment.find({ employeeId: employee._id }).sort({ createdAt: -1 });

    res.json({ employee, workLogs, salaries, attendance, payments });
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// POST daily work log (with immutable RateMaster rate snapshot & total calculation)
router.post('/:id/worklog', authMiddleware, async (req, res) => {
  try {
    const qty = Number(req.body.quantity !== undefined ? req.body.quantity : req.body.garmentsCompleted) || 1;
    const rateSnap = Number(req.body.rateSnapshot !== undefined ? req.body.rateSnapshot : req.body.baseRatePerPiece) || 0;
    const calcTotal = Number(req.body.total !== undefined ? req.body.total : req.body.pieceRateEarned) || (qty * rateSnap);

    const log = new DailyWorkLog({
      employeeId: req.params.id,
      ...req.body,
      quantity: qty,
      rateSnapshot: rateSnap,
      total: calcTotal,
      garmentsCompleted: qty,
      baseRatePerPiece: rateSnap,
      pieceRateEarned: calcTotal,
      productType: req.body.productType || req.body.garmentName || 'General'
    });
    await log.save();
    res.status(201).json(log);
  } catch (err) {
    res.status(400).json({ message: 'Bad Request', error: err.message });
  }
});

// POST salary record (legacy support)
router.post('/:id/salary', authMiddleware, async (req, res) => {
  try {
    const salary = new Salary({
      employeeId: req.params.id,
      ...req.body,
      status: 'Paid',
      paymentDate: new Date()
    });
    await salary.save();
    res.status(201).json(salary);
  } catch (err) {
    res.status(400).json({ message: 'Bad Request', error: err.message });
  }
});

// POST piece-rate payment transaction with remaining balance validation
router.post('/:id/payment', authMiddleware, async (req, res) => {
  try {
    const paymentVal = Number(req.body.paymentAmount) || 0;
    if (paymentVal <= 0) {
      return res.status(400).json({ message: 'Payment amount must be greater than zero.' });
    }

    const gross = Number(req.body.grossAmount) || 0;
    const alreadyPaid = Number(req.body.alreadyPaidBefore) || 0;
    const remaining = gross - alreadyPaid;

    const payment = new Payment({
      employeeId: req.params.id,
      ...req.body,
      paymentAmount: paymentVal,
      remainingAfterPayment: remaining - paymentVal,
      createdBy: 'Owner/Admin'
    });
    await payment.save();
    res.status(201).json(payment);
  } catch (err) {
    res.status(400).json({ message: 'Bad Request: Failed to save payment', error: err.message });
  }
});

// DELETE employee (idempotent design for zero 404 deadlocks on cache refreshes)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const query = mongoose.Types.ObjectId.isValid(req.params.id)
      ? { $or: [{ _id: req.params.id }, { employeeId: req.params.id }] }
      : { employeeId: req.params.id };
    const employee = await Employee.findOneAndDelete(query);
    
    if (!employee) {
      return res.json({ success: true, message: 'Employee already removed from database' });
    }
    
    // Clean up associated HR records in MongoDB
    await DailyWorkLog.deleteMany({ employeeId: employee._id });
    await Salary.deleteMany({ employeeId: employee._id });
    await Payment.deleteMany({ employeeId: employee._id });
    await Attendance.deleteMany({ employeeId: employee._id });

    res.json({ success: true, message: 'Employee and related HR records deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

module.exports = router;
