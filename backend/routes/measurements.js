const express = require('express');
const router = express.Router();
const { MeasurementTemplate, CustomerMeasurement, MeasurementVersion } = require('../models/Measurement');
const CustomerTimeline = require('../models/CustomerTimeline');
const { authMiddleware } = require('../middleware/auth');
const { sendSuccess, sendError } = require('../utils/response');
const { validateMeasurementPayload } = require('../utils/validation');

// Seed standard measurement templates
const seedTemplates = async () => {
  const templates = [
    {
      customerType: 'Male',
      garmentType: 'Shirt',
      fields: [
        { fieldKey: 'length', displayName: 'Length', category: 'Postural & Lengths', inputType: 'number', bodyZone: 'torso', required: true, displayOrder: 1 },
        { fieldKey: 'shoulder', displayName: 'Shoulder', category: 'Upper Body', inputType: 'number', bodyZone: 'shoulder', required: true, displayOrder: 2 },
        { fieldKey: 'sleeves', displayName: 'Sleeves', category: 'Arm & Sleeve', inputType: 'number', bodyZone: 'arm', required: true, displayOrder: 3 },
        { fieldKey: 'chest', displayName: 'Chest', category: 'Upper Body', inputType: 'number', bodyZone: 'chest', required: true, displayOrder: 4 },
        { fieldKey: 'stomach', displayName: 'Stomach', category: 'Upper Body', inputType: 'number', bodyZone: 'waist', required: true, displayOrder: 5 },
        { fieldKey: 'seat', displayName: 'Seat', category: 'Lower Body', inputType: 'number', bodyZone: 'hip', required: true, displayOrder: 6 },
        { fieldKey: 'front1', displayName: 'Front 1', category: 'Upper Body', inputType: 'number', bodyZone: 'chest', required: true, displayOrder: 7 },
        { fieldKey: 'front2', displayName: 'Front 2', category: 'Upper Body', inputType: 'number', bodyZone: 'chest', required: true, displayOrder: 8 },
        { fieldKey: 'front3', displayName: 'Front 3', category: 'Upper Body', inputType: 'number', bodyZone: 'chest', required: true, displayOrder: 9 },
        { fieldKey: 'mundho', displayName: 'Mundho', category: 'Arm & Sleeve', inputType: 'number', bodyZone: 'arm', required: true, displayOrder: 10 },
        { fieldKey: 'remarks', displayName: 'Remarks', category: 'Styling', inputType: 'text', bodyZone: 'none', required: false, displayOrder: 11 }
      ]
    },
    {
      customerType: 'Male',
      garmentType: 'Pant',
      fields: [
        { fieldKey: 'length_pant', displayName: 'Length', category: 'Lower Body', inputType: 'number', bodyZone: 'leg', required: true, displayOrder: 1 },
        { fieldKey: 'waist_pant', displayName: 'Waist', category: 'Lower Body', inputType: 'number', bodyZone: 'waist', required: true, displayOrder: 2 },
        { fieldKey: 'seat', displayName: 'Seat', category: 'Lower Body', inputType: 'number', bodyZone: 'hip', required: true, displayOrder: 3 },
        { fieldKey: 'thighs', displayName: 'Thighs (jaang)', category: 'Lower Body', inputType: 'number', bodyZone: 'thigh', required: true, displayOrder: 4 },
        { fieldKey: 'knee', displayName: 'Knee', category: 'Lower Body', inputType: 'number', bodyZone: 'leg', required: true, displayOrder: 5 },
        { fieldKey: 'bottom', displayName: 'Bottom', category: 'Lower Body', inputType: 'number', bodyZone: 'ankle', required: true, displayOrder: 6 },
        { fieldKey: 'langot', displayName: 'Langot (from middle to back ) stitches', category: 'Lower Body', inputType: 'number', bodyZone: 'hip', required: true, displayOrder: 7 }
      ]
    },
    {
      customerType: 'Female',
      garmentType: 'Lehenga',
      fields: [
        { fieldKey: 'waist', displayName: 'Waist', category: 'Lower Body', inputType: 'number', bodyZone: 'waist', required: true, displayOrder: 1 },
        { fieldKey: 'hip', displayName: 'Hip', category: 'Lower Body', inputType: 'number', bodyZone: 'hip', required: true, displayOrder: 2 },
        { fieldKey: 'lehengaLength', displayName: 'Lehenga Length', category: 'Lower Body', inputType: 'number', bodyZone: 'leg', required: true, displayOrder: 3 },
        { fieldKey: 'canCan', displayName: 'Can Can Volume', category: 'Styling', inputType: 'select', bodyZone: 'none', required: false, displayOrder: 4 }
      ]
    },
    {
      customerType: 'Female',
      garmentType: 'Blouse',
      fields: [
        { fieldKey: 'bust', displayName: 'Bust', category: 'Upper Body', inputType: 'number', bodyZone: 'chest', required: true, displayOrder: 1 },
        { fieldKey: 'upperBust', displayName: 'Upper Bust', category: 'Upper Body', inputType: 'number', bodyZone: 'chest', required: true, displayOrder: 2 },
        { fieldKey: 'underBust', displayName: 'Under Bust', category: 'Upper Body', inputType: 'number', bodyZone: 'chest', required: true, displayOrder: 3 },
        { fieldKey: 'shoulder', displayName: 'Shoulder', category: 'Upper Body', inputType: 'number', bodyZone: 'shoulder', required: true, displayOrder: 4 },
        { fieldKey: 'blouseLength', displayName: 'Blouse Length', category: 'Upper Body', inputType: 'number', bodyZone: 'torso', required: true, displayOrder: 5 },
        { fieldKey: 'sleeveLength', displayName: 'Sleeve Length', category: 'Upper Body', inputType: 'number', bodyZone: 'arm', required: true, displayOrder: 6 }
      ]
    }
  ];

  for (const t of templates) {
    await MeasurementTemplate.updateOne(
      { customerType: t.customerType, garmentType: t.garmentType },
      { $set: t },
      { upsert: true }
    );
  }
};

const mongoose = require('mongoose');
const runSeed = () => {
  seedTemplates().catch(err => console.error('Template seed error:', err.message));
};

if (mongoose.connection.readyState === 1) {
  runSeed();
} else {
  mongoose.connection.once('open', runSeed);
}

// GET templates (filtered by customerType and garmentType)
router.get('/templates', authMiddleware, async (req, res, next) => {
  try {
    const { customerType, garmentType } = req.query;
    const query = {};
    if (customerType) query.customerType = customerType;
    if (garmentType) query.garmentType = garmentType;
    
    const templates = await MeasurementTemplate.find(query).lean();
    return sendSuccess(res, 200, 'Measurement templates retrieved', templates);
  } catch (err) {
    next(err);
  }
});

// GET customer measurements and version history
router.get('/customer/:customerId', authMiddleware, async (req, res, next) => {
  try {
    const activeMeasurements = await CustomerMeasurement.find({ customerId: req.params.customerId }).lean();
    const history = await MeasurementVersion.find({ customerId: req.params.customerId }).sort({ createdAt: -1 }).lean();
    
    return sendSuccess(res, 200, 'Customer measurements retrieved successfully', {
      active: activeMeasurements,
      history
    });
  } catch (err) {
    next(err);
  }
});

// POST save or update customer measurement with automatic version history tracking
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const validation = validateMeasurementPayload(req.body);
    if (!validation.isValid) {
      return sendError(res, 400, 'Validation Error', validation.errors);
    }

    const { customerId, garmentType, measurements, changeReason } = req.body;
    let existing = await CustomerMeasurement.findOne({ customerId, garmentType });
    let versionNum = 1;

    if (existing) {
      versionNum = (existing.version || 1) + 1;
      existing.measurements = measurements;
      existing.version = versionNum;
      existing.lastUpdatedBy = req.user?.id || null;
      await existing.save();
    } else {
      existing = new CustomerMeasurement({
        customerId,
        garmentType,
        measurements,
        version: versionNum,
        lastUpdatedBy: req.user?.id || null
      });
      await existing.save();
    }

    // Save historical version record
    const historyEntry = new MeasurementVersion({
      measurementId: existing._id,
      customerId,
      garmentType,
      versionNumber: versionNum,
      measurements,
      changeReason: changeReason || `Updated ${garmentType} measurement specifications`,
      createdBy: req.user?.id || null
    });
    await historyEntry.save();

    // Log to Customer Audit Timeline
    await CustomerTimeline.create({
      customerId,
      action: 'Measurement Updated',
      description: `Updated ${garmentType} measurements (v${versionNum}). Reason: ${changeReason || 'Profile update'}`,
      performedBy: req.user?.id || null
    });

    return sendSuccess(res, 200, 'Measurement saved successfully', existing);
  } catch (err) {
    next(err);
  }
});

// POST restore measurement from historical version
router.post('/restore/:versionId', authMiddleware, async (req, res, next) => {
  try {
    const versionEntry = await MeasurementVersion.findById(req.params.versionId);
    if (!versionEntry) {
      return sendError(res, 404, 'Measurement version record not found.');
    }

    const { customerId, garmentType, measurements, versionNumber } = versionEntry;
    let existing = await CustomerMeasurement.findOne({ customerId, garmentType });
    const newVersionNum = existing ? (existing.version || 1) + 1 : 1;

    if (existing) {
      existing.measurements = measurements;
      existing.version = newVersionNum;
      existing.lastUpdatedBy = req.user?.id || null;
      await existing.save();
    } else {
      existing = new CustomerMeasurement({
        customerId,
        garmentType,
        measurements,
        version: newVersionNum,
        lastUpdatedBy: req.user?.id || null
      });
      await existing.save();
    }

    // Save new version reflecting the rollback
    await MeasurementVersion.create({
      measurementId: existing._id,
      customerId,
      garmentType,
      versionNumber: newVersionNum,
      measurements,
      changeReason: `Restored to state from Version #${versionNumber}`,
      createdBy: req.user?.id || null
    });

    // Audit Log Timeline
    await CustomerTimeline.create({
      customerId,
      action: 'Measurement Restored',
      description: `Restored ${garmentType} fitting to earlier Version #${versionNumber} (now v${newVersionNum}).`,
      performedBy: req.user?.id || null
    });

    return sendSuccess(res, 200, `Measurement successfully restored from Version #${versionNumber}`, existing);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
