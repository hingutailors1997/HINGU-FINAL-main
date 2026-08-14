const mongoose = require('mongoose');

/**
 * PHASE 4 ARCHITECTURE: Configurable Order Workflow Engine
 * Eliminates hardcoded order statuses. Owner/Admin can Add, Rename, Reorder, Disable stages and customize colors/permissions without code changes.
 */
const OrderWorkflowStageSchema = new mongoose.Schema({
  stageName: { type: String, required: true, unique: true },
  orderIndex: { type: Number, required: true }, // Determines visual sequence in production pipeline
  color: { type: String, default: '#3B82F6' }, // Hex color code for status badges and pipeline cards
  icon: { type: String, default: 'Scissors' }, // Lucide icon identifier
  permissions: [{ type: String, enum: ['owner', 'admin', 'manager', 'store_keeper', 'tailor', 'reception'], default: ['owner', 'admin', 'manager', 'tailor'] }],
  isDisabled: { type: Boolean, default: false },
  isDefaultStart: { type: Boolean, default: false }, // Tag for initial stage upon creation
  isDefaultEnd: { type: Boolean, default: false }, // Tag for finished / closed state
  description: { type: String }
}, { timestamps: true });

OrderWorkflowStageSchema.index({ orderIndex: 1 });

const OrderItemSchema = new mongoose.Schema({
  garmentType: { type: String, required: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' }, // For corporate orders
  employeeName: { type: String }, // For corporate orders
  quantity: { type: Number, required: true, default: 1 },
  measurementVersionId: { type: mongoose.Schema.Types.ObjectId, ref: 'MeasurementVersion' }, // Locks exact Measurement Version document ID (No duplicate measurement objects stored)
  measurementId: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomerMeasurement' },
  measurementVersion: { type: Number, default: 1 }, // Locks measurement version number at time of cut
  fabricId: { type: mongoose.Schema.Types.ObjectId, ref: 'FabricInventory' },
  fabricBarcode: { type: String },
  fabricProvidedByCustomer: { type: Boolean, default: false },
  fabricMeterageUsed: { type: Number, default: 0 },
  accessories: [{
    name: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    unitCost: { type: Number, default: 0 }
  }],
  unitPrice: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  notes: { type: String },
  currentStage: { type: String, default: 'Order Created' }, // Dynamic reference to OrderWorkflowStage.stageName
  assignedTailorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedTailorName: { type: String },
  completionEstimateMinutes: { type: Number }
}, { timestamps: true });

const OrderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' }, // Optional for Corporate Orders
  companyGroupId: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomerGroup' }, // For Corporate Orders
  customerName: { type: String }, // Name of individual OR Name of corporate group
  customerPhone: { type: String },
  items: [OrderItemSchema],
  
  // Financial specifics
  totalAmount: { type: Number, required: true, default: 0 },
  discount: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  advancePaid: { type: Number, default: 0 },
  balanceAmount: { type: Number, required: true, default: 0 },
  payments: [{
    amount: { type: Number, required: true },
    method: { type: String, enum: ['Cash', 'UPI', 'Credit Card', 'Debit Card', 'Bank Transfer'], default: 'Cash' },
    date: { type: Date, default: Date.now },
    reference: { type: String },
    receivedBy: { type: String }
  }],
  invoice: {
    number: { type: String },
    url: { type: String }
  },

  // Scheduling & Workflow
  currentStage: { type: String, default: 'Order Created' }, // Dynamic stage name instead of hardcoded enum
  priority: { type: String, enum: ['Normal', 'High', 'Urgent', 'Express Wedding'], default: 'Normal' },
  orderDate: { type: Date, default: Date.now },
  trialDate: { type: Date },
  dueDate: { type: Date },
  deliveryDate: { type: Date },
  assignedTailorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedTailorName: { type: String },

  // Fabric & Resource Allocation
  fabricAllocation: [{
    fabricId: { type: mongoose.Schema.Types.ObjectId, ref: 'FabricInventory' },
    barcode: { type: String },
    fabricName: { type: String },
    metersReserved: { type: Number, default: 0 },
    metersDeducted: { type: Number, default: 0 },
    status: { type: String, enum: ['Pending Allocation', 'Reserved', 'Cut & Deducted', 'Returned'], default: 'Pending Allocation' }
  }],

  // Timelines & Audit Histories
  alterationHistory: [{
    date: { type: Date, default: Date.now },
    notes: { type: String, required: true },
    performedBy: { type: String },
    resolved: { type: Boolean, default: false }
  }],
  productionTimeline: [{
    stage: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    performedBy: { type: String },
    notes: { type: String }
  }],
  internalNotes: { type: String },
  attachments: [{
    url: { type: String, required: true },
    name: { type: String },
    fileType: { type: String }, // 'sketch', 'reference_photo', 'audio_instruction'
    uploadedAt: { type: Date, default: Date.now }
  }],
  
  // POS Scanning Support
  barcode: { type: String, unique: true, sparse: true }, // Code128 scannable tag for garment bags
  qrCode: { type: String, unique: true, sparse: true },  // Web URL for customer tracking / Tailor station camera scan
  
  // Public Sharing
  shareToken: { type: String, unique: true, sparse: true },

  // Immutable Security Audit Log
  auditLog: [{
    action: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    userId: { type: mongoose.Schema.Types.ObjectId },
    userName: { type: String, default: 'System' },
    details: { type: String }
  }],

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdByName: { type: String }
}, { timestamps: true });

// Explicit production indexes for rapid POS querying and Tailor dashboard filters
OrderSchema.index({ customerId: 1, currentStage: 1 });
OrderSchema.index({ assignedTailorId: 1, currentStage: 1 });
OrderSchema.index({ dueDate: 1, priority: 1 });
OrderSchema.index({ orderDate: -1 });

// Hot-reloadable Mongoose schema registration
module.exports = {
  OrderWorkflowStage: mongoose.models.OrderWorkflowStage || mongoose.model('OrderWorkflowStage', OrderWorkflowStageSchema),
  Order: mongoose.models.Order || mongoose.model('Order', OrderSchema),
  OrderItem: mongoose.models.OrderItem || mongoose.model('OrderItem', OrderItemSchema)
};
