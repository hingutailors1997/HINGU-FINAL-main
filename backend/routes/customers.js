const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Customer = require('../models/Customer');
const { CustomerMeasurement, MeasurementVersion } = require('../models/Measurement');
const CustomerTimeline = require('../models/CustomerTimeline');
const CustomerGallery = require('../models/CustomerGallery');
const CustomerDocument = require('../models/CustomerDocument');
const CustomerPreferences = require('../models/CustomerPreferences');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { sendSuccess, sendError } = require('../utils/response');
const { validateCustomerPayload } = require('../utils/validation');
const { Order, OrderItem } = require('../models/Order');

// GET all customers (with pagination, filtering, searching, sorting)
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, status, sort = '-createdAt' } = req.query;
    
    // Build MongoDB Query
    const query = { isDeleted: false, companyGroupId: { $exists: false } };
    
    if (search && search.trim() !== '') {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { fullName: regex },
        { firstName: regex },
        { lastName: regex },
        { mobile: regex },
        { whatsapp: regex },
        { customerId: regex },
        { email: regex },
        { gstNumber: regex },
        { preferredLanguage: regex },
        { 'address.city': regex }
      ];
    }
    if (status && status !== 'All') query.status = status;

    if (req.query.city && req.query.city !== 'All') query['address.city'] = new RegExp(req.query.city.trim(), 'i');
    if (req.query.preferredLanguage && req.query.preferredLanguage !== 'All') query.preferredLanguage = new RegExp(req.query.preferredLanguage.trim(), 'i');
    if (req.query.gstNumber) query.gstNumber = new RegExp(req.query.gstNumber.trim(), 'i');

    
    const skip = (Number(page) - 1) * Number(limit);
    const customers = await Customer.find(query)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean();
      
    const total = await Customer.countDocuments(query);
    
    // Enhance customer metrics with Order stats
    const enhancedCustomers = await Promise.all(customers.map(async (c) => {
      const orders = await Order.find({ customerId: c._id });
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const advancePaid = orders.reduce((sum, o) => sum + (o.advancePaid || 0), 0);
      
      return {
        ...c,
        firstName: c.firstName || (c.fullName ? c.fullName.split(' ')[0] : 'Customer'),
        lastName: c.lastName || (c.fullName && c.fullName.includes(' ') ? c.fullName.substring(c.fullName.indexOf(' ') + 1) : ''),
        totalOrders: c.totalOrders > totalOrders ? c.totalOrders : totalOrders,
        totalRevenue: c.totalRevenue > totalRevenue ? c.totalRevenue : totalRevenue,
        pendingBalance: totalRevenue - advancePaid
      };
    }));
    
    return sendSuccess(res, 200, 'Customers retrieved successfully', {
      customers: enhancedCustomers,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      totalCustomers: total
    });
  } catch (err) {
    next(err);
  }
});

// Sync calculations utility route
router.get('/sync', async (req, res, next) => {
  try {
    const { Order } = require('../models/Order');
    const customers = await Customer.find({ isDeleted: false });
    let updatedCount = 0;
    
    for (const c of customers) {
      const orders = await Order.find({ customerId: c._id });
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const advancePaid = orders.reduce((sum, o) => sum + (o.advancePaid || 0), 0);
      const pendingBalance = totalRevenue - advancePaid;
      
      await Customer.findByIdAndUpdate(c._id, {
        totalOrders,
        totalRevenue,
        pendingAmount: pendingBalance
      });
      updatedCount++;
    }
    return sendSuccess(res, 200, 'Customer metrics synchronization completed', { updatedCount });
  } catch (err) {
    next(err);
  }
});

// GET single customer profile by ID
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { Order } = require('../models/Order');
    const customer = await Customer.findOne({ _id: req.params.id, isDeleted: false }).lean();
    if (!customer) return sendError(res, 404, 'Customer not found or has been archived.');
    
    const orders = await Order.find({ customerId: customer._id }).lean();
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const advancePaid = orders.reduce((sum, o) => sum + (o.advancePaid || 0), 0);
    
    // Compute live stats from real order data
    const closedStages = ['Delivered', 'Completed', 'Closed', 'Cancelled'];
    const pendingOrders = orders.filter(o => !closedStages.includes(o.currentStage));
    const pendingOrderCount = pendingOrders.length;
    const totalInvoiceCount = totalOrders;
    
    // Find nearest upcoming delivery from pending orders with a dueDate
    let upcomingDelivery = null;
    const now = new Date();
    const upcomingOrders = pendingOrders
      .filter(o => o.dueDate && new Date(o.dueDate) >= now)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    if (upcomingOrders.length > 0) {
      const nextOrder = upcomingOrders[0];
      const garment = nextOrder.items && nextOrder.items.length > 0 ? nextOrder.items[0].garmentType : 'Order';
      upcomingDelivery = { date: nextOrder.dueDate, garment, orderNumber: nextOrder.orderNumber };
    }
    
    // Count total alteration history entries across all orders
    const alterationCount = orders.reduce((sum, o) => sum + (o.alterationHistory ? o.alterationHistory.length : 0), 0);
    // Count pending (unresolved) alterations
    const pendingAlterationCount = orders.reduce((sum, o) => {
      if (!o.alterationHistory) return sum;
      return sum + o.alterationHistory.filter(a => !a.resolved).length;
    }, 0);
    
    // Payment status computation
    const pendingBalance = totalRevenue - advancePaid;
    const paymentStatus = pendingBalance <= 0 ? 'Fully Paid' : `₹${pendingBalance.toLocaleString('en-IN')} Pending`;
    
    const enhancedCustomer = {
      ...customer,
      firstName: customer.firstName || (customer.fullName ? customer.fullName.split(' ')[0] : 'Customer'),
      lastName: customer.lastName || (customer.fullName && customer.fullName.includes(' ') ? customer.fullName.substring(customer.fullName.indexOf(' ') + 1) : ''),
      totalOrders: customer.totalOrders > totalOrders ? customer.totalOrders : totalOrders,
      totalRevenue: customer.totalRevenue > totalRevenue ? customer.totalRevenue : totalRevenue,
      pendingBalance,
      pendingOrderCount,
      totalInvoiceCount,
      upcomingDelivery,
      alterationCount,
      pendingAlterationCount,
      paymentStatus
    };
    
    return sendSuccess(res, 200, 'Customer profile retrieved successfully', enhancedCustomer);
  } catch (err) {
    next(err);
  }
});

// Shared Customer Registration logic for POST / and POST /register
const handleCustomerRegistration = async (req, res, next) => {
  const personalDetails = req.body.personalDetails || req.body;
  const measurementDetails = req.body.measurementDetails || null;

  // 1. Validate Input
  const validation = validateCustomerPayload(personalDetails, true);
  if (!validation.isValid) {
    return sendError(res, 400, 'Validation Error', validation.errors);
  }

  // Check for duplicate mobile only for individual customers
  if (!personalDetails.companyGroupId) {
    const existing = await Customer.findOne({ mobile: personalDetails.mobile, isDeleted: false, companyGroupId: { $exists: false } });
    if (existing) {
      return sendError(res, 409, `Customer with mobile ${personalDetails.mobile} already exists (${existing.customerId}).`, { mobile: 'Duplicate mobile number' });
    }
  }

  const session = await mongoose.startSession();
  let useTransaction = false;
  try {
    session.startTransaction();
    useTransaction = true;
  } catch (e) {
    // Standalone fallback if replica set is not configured
    useTransaction = false;
  }

  try {
    // Do not assign customerId if part of a corporate group
    const isCorporateEmployee = personalDetails.companyGroupId && personalDetails.companyGroupId.trim() !== '';
    let customerId;
    if (!isCorporateEmployee) {
      console.log('--- EXECUTING NEW CUSTOMER ID LOGIC ---');
      const existingCustomers = await Customer.find({ customerId: /^CUS-/ }).select('customerId').lean();
      let maxNum = 0;
      for (const c of existingCustomers) {
        const match = c.customerId.match(/CUS-(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
      console.log(`Found maxNum: ${maxNum}. Next ID will be CUS-${String(maxNum + 1).padStart(2, '0')}`);
      customerId = `CUS-${String(maxNum + 1).padStart(2, '0')}`;
    }
    
    const fullName = personalDetails.fullName || `${personalDetails.firstName || ''} ${personalDetails.lastName || ''}`.trim();

    // Create Customer
    const customerPayload = {
      ...personalDetails,
      fullName: fullName || 'Unnamed Customer',
      customerId,
      companyGroupId: (personalDetails.companyGroupId && personalDetails.companyGroupId.trim() !== '') ? personalDetails.companyGroupId : undefined,
      profilePhotoUrl: personalDetails.photo || undefined,
      createdBy: req.user?.id || null
    };
    
    // Explicitly remove customerId if it's undefined or empty, to prevent MongoDB indexing it as `null`
    if (!customerPayload.customerId) {
      delete customerPayload.customerId;
    }

    const newCustomer = new Customer(customerPayload);
    const savedCustomer = useTransaction ? await newCustomer.save({ session }) : await newCustomer.save();
    
    // Save Measurements & Version History if provided
    if (measurementDetails && measurementDetails.measurements && Object.keys(measurementDetails.measurements).length > 0) {
      const newMeasurement = new CustomerMeasurement({
        customerId: savedCustomer._id,
        garmentType: measurementDetails.garmentType || 'Shirt',
        measurements: measurementDetails.measurements,
        version: 1,
        lastUpdatedBy: req.user?.id || null
      });
      const savedMeasurement = useTransaction ? await newMeasurement.save({ session }) : await newMeasurement.save();
      
      const newVersion = new MeasurementVersion({
        measurementId: savedMeasurement._id,
        customerId: savedCustomer._id,
        garmentType: measurementDetails.garmentType || 'Shirt',
        versionNumber: 1,
        measurements: measurementDetails.measurements,
        changeReason: 'Initial Registration',
        createdBy: req.user?.id || null
      });
      useTransaction ? await newVersion.save({ session }) : await newVersion.save();
    }
    
    // Create Audit Log Timeline Event
    const timelineEvent = new CustomerTimeline({
      customerId: savedCustomer._id,
      action: 'Customer Created',
      description: 'Customer profile registered into MongoDB database.',
      performedBy: req.user?.id || null
    });
    useTransaction ? await timelineEvent.save({ session }) : await timelineEvent.save();
    
    if (useTransaction) {
      await session.commitTransaction();
    }
    session.endSession();
    
    return sendSuccess(res, 201, 'Customer registered successfully', savedCustomer);
  } catch (err) {
    if (useTransaction) {
      await session.abortTransaction();
    }
    session.endSession();
    next(err);
  }
};

router.post('/', authMiddleware, handleCustomerRegistration);
router.post('/register', authMiddleware, handleCustomerRegistration);

// PUT update customer personal details or internal notes
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const validation = validateCustomerPayload(req.body, false);
    if (!validation.isValid) {
      return sendError(res, 400, 'Validation Error', validation.errors);
    }

    const payload = { ...req.body, updatedBy: req.user?.id || null };
    if (req.body.photo) {
      payload.profilePhotoUrl = req.body.photo;
      delete payload.photo;
    }

    const updatedCustomer = await Customer.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { $set: payload },
      { new: true, runValidators: true }
    );
    
    if (!updatedCustomer) {
      return sendError(res, 404, 'Customer not found.');
    }

    // Determine action description
    const actionDesc = req.body.notes !== undefined && Object.keys(req.body).length <= 2 
      ? 'Internal staff notes were modified.' 
      : 'Personal details or contact information were updated.';
    
    // Audit Log Timeline
    await CustomerTimeline.create({
      customerId: updatedCustomer._id,
      action: 'Profile Updated',
      description: actionDesc,
      performedBy: req.user?.id || null
    });
    
    return sendSuccess(res, 200, 'Customer profile updated successfully', updatedCustomer);
  } catch (err) {
    next(err);
  }
});

// DELETE customer (Permanent delete and clean associated records)
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const query = mongoose.Types.ObjectId.isValid(req.params.id)
      ? { $or: [{ _id: req.params.id }, { customerId: req.params.id }] }
      : { customerId: req.params.id };
      
    const customer = await Customer.findOneAndDelete(query);
    if (!customer) return sendSuccess(res, 200, 'Customer already removed from database');
    
    // Clean up associated CRM records
    await CustomerMeasurement.deleteMany({ customerId: customer._id }).catch(() => {});
    await CustomerTimeline.deleteMany({ customerId: customer._id }).catch(() => {});
    await CustomerGallery.deleteMany({ customerId: customer._id }).catch(() => {});
    await CustomerDocument.deleteMany({ customerId: customer._id }).catch(() => {});
    await CustomerPreferences.deleteMany({ customerId: customer._id }).catch(() => {});
    
    // Clean up associated Orders and OrderItems
    const orders = await Order.find({ customerId: customer._id });
    const orderIds = orders.map(o => o._id);
    if (orderIds.length > 0) {
      await OrderItem.deleteMany({ orderId: { $in: orderIds } }).catch(() => {});
      await Order.deleteMany({ customerId: customer._id }).catch(() => {});
    }
    
    return sendSuccess(res, 200, 'Customer and related CRM records removed permanently');
  } catch (err) {
    next(err);
  }
});

// POST update customer profile photo
router.post('/:id/photo', authMiddleware, upload.single('photo'), async (req, res, next) => {
  try {
    if (!req.file) return sendError(res, 400, 'No image file uploaded');
    
    // Cloudinary returns a URL in path. Local disk returns an absolute C:/ path.
    const fileUrl = (req.file.path && req.file.path.startsWith('http')) 
      ? req.file.path 
      : `/uploads/${req.file.filename || req.file.originalname}`;
      
    const updatedCustomer = await Customer.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { $set: { profilePhotoUrl: fileUrl, updatedBy: req.user?.id || null } },
      { new: true }
    );
    
    if (!updatedCustomer) return sendError(res, 404, 'Customer not found.');

    await CustomerTimeline.create({
      customerId: req.params.id,
      action: 'Profile Photo Updated',
      description: 'Customer profile photo was updated.',
      performedBy: req.user?.id || null
    });

    return sendSuccess(res, 200, 'Photo updated successfully', updatedCustomer);
  } catch (err) {
    next(err);
  }
});

// GET customer gallery
router.get('/:id/gallery', authMiddleware, async (req, res, next) => {
  try {
    const gallery = await CustomerGallery.find({ customerId: req.params.id }).sort({ createdAt: -1 });
    return sendSuccess(res, 200, 'Gallery retrieved successfully', gallery);
  } catch (err) {
    next(err);
  }
});

// POST upload to customer gallery
router.post('/:id/gallery', authMiddleware, upload.single('media'), async (req, res, next) => {
  try {
    if (!req.file) return sendError(res, 400, 'No image file uploaded');
    
    const fileUrl = (req.file.path && req.file.path.startsWith('http')) 
      ? req.file.path 
      : `/uploads/${req.file.filename || req.file.originalname}`;
      
    const newMedia = new CustomerGallery({
      customerId: req.params.id,
      category: req.body.category || 'Reference Design',
      fileName: req.file.originalname || `image_${Date.now()}`,
      fileUrl: fileUrl, // Cloudinary or local path
      uploadedBy: req.user?.id || null,
      notes: req.body.notes || ''
    });
    
    const savedMedia = await newMedia.save();

    // Audit Log Timeline
    await CustomerTimeline.create({
      customerId: req.params.id,
      action: 'Gallery Media Added',
      description: `Uploaded new photo under category: ${req.body.category || 'Reference Design'}`,
      performedBy: req.user?.id || null
    });

    return sendSuccess(res, 201, 'Image uploaded successfully', savedMedia);
  } catch (err) {
    next(err);
  }
});

// DELETE customer gallery media
router.delete('/:id/gallery/:mediaId', authMiddleware, roleMiddleware(['owner', 'manager', 'admin']), async (req, res, next) => {
  try {
    const media = await CustomerGallery.findOneAndDelete({ _id: req.params.mediaId, customerId: req.params.id });
    if (!media) return sendError(res, 404, 'Gallery image not found');

    // Attempt cloudinary cleanup
    try {
      if (media.fileUrl && media.fileUrl.includes('cloudinary')) {
        const cloudinary = require('cloudinary').v2;
        const parts = media.fileUrl.split('/');
        const publicId = parts[parts.length - 1].split('.')[0];
        await cloudinary.uploader.destroy(publicId).catch(() => {});
      }
    } catch (e) { /* silent fail on cloudinary cleanup */ }

    await CustomerTimeline.create({
      customerId: req.params.id,
      action: 'Gallery Media Deleted',
      description: `Deleted gallery photo: ${media.fileName || media.category}`,
      performedBy: req.user?.id || null
    });

    return sendSuccess(res, 200, 'Gallery media deleted successfully');
  } catch (err) {
    next(err);
  }
});

// GET customer documents
router.get('/:id/documents', authMiddleware, async (req, res, next) => {
  try {
    const documents = await CustomerDocument.find({ customerId: req.params.id }).sort({ createdAt: -1 });
    return sendSuccess(res, 200, 'Documents retrieved successfully', documents);
  } catch (err) {
    next(err);
  }
});

// POST upload customer document
router.post('/:id/documents', authMiddleware, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return sendError(res, 400, 'No document file uploaded');
    
    const docType = req.body.documentType || 'Other';
    const docName = req.body.documentName || req.file.originalname;

    const fileUrl = (req.file.path && req.file.path.startsWith('http')) 
      ? req.file.path 
      : `/uploads/${req.file.filename || req.file.originalname}`;

    const newDoc = new CustomerDocument({
      customerId: req.params.id,
      fileUrl: fileUrl,
      publicId: req.file.filename || req.file.originalname || `doc_${Date.now()}`,
      documentType: docType,
      documentName: docName,
      description: req.body.description || '',
      uploadedBy: req.user?.id || null
    });
    
    const savedDoc = await newDoc.save();

    // Audit Log Timeline
    await CustomerTimeline.create({
      customerId: req.params.id,
      action: 'Document Uploaded',
      description: `Uploaded ${docType} document: ${docName}`,
      performedBy: req.user?.id || null
    });

    return sendSuccess(res, 201, 'Document uploaded successfully', savedDoc);
  } catch (err) {
    next(err);
  }
});

// DELETE customer document
router.delete('/:id/documents/:docId', authMiddleware, roleMiddleware(['owner', 'manager', 'admin']), async (req, res, next) => {
  try {
    const doc = await CustomerDocument.findOneAndDelete({ _id: req.params.docId, customerId: req.params.id });
    if (!doc) return sendError(res, 404, 'Document not found');

    // Attempt cloudinary cleanup
    try {
      if (doc.fileUrl && doc.fileUrl.includes('cloudinary')) {
        const cloudinary = require('cloudinary').v2;
        await cloudinary.uploader.destroy(doc.publicId).catch(() => {});
      }
    } catch (e) { /* silent fail on cloudinary cleanup */ }

    await CustomerTimeline.create({
      customerId: req.params.id,
      action: 'Document Deleted',
      description: `Deleted ${doc.documentType} document: ${doc.documentName}`,
      performedBy: req.user?.id || null
    });

    return sendSuccess(res, 200, 'Document deleted successfully');
  } catch (err) {
    next(err);
  }
});


// GET customer timeline history
router.get('/:id/timeline', authMiddleware, async (req, res, next) => {
  try {
    const timeline = await CustomerTimeline.find({ customerId: req.params.id })
      .populate('performedBy', 'name')
      .sort({ createdAt: -1 });
    return sendSuccess(res, 200, 'Timeline retrieved successfully', timeline);
  } catch (err) {
    next(err);
  }
});

// GET customer tailoring preferences
router.get('/:id/preferences', authMiddleware, async (req, res, next) => {
  try {
    const prefs = await CustomerPreferences.findOne({ customerId: req.params.id }).lean();
    return sendSuccess(res, 200, 'Preferences retrieved successfully', prefs || {});
  } catch (err) {
    next(err);
  }
});

// POST save/update customer preferences
router.post('/:id/preferences', authMiddleware, async (req, res, next) => {
  try {
    const updatedPrefs = await CustomerPreferences.findOneAndUpdate(
      { customerId: req.params.id },
      { $set: { ...req.body, customerId: req.params.id } },
      { new: true, upsert: true }
    );
    
    // Audit Log Timeline
    await CustomerTimeline.create({
      customerId: req.params.id,
      action: 'Preferences Updated',
      description: 'Tailoring default preferences were modified.',
      performedBy: req.user?.id || null
    });
    
    return sendSuccess(res, 200, 'Preferences saved successfully', updatedPrefs);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
