const mongoose = require('mongoose');

const MeasurementTemplateSchema = new mongoose.Schema({
  customerType: { type: String, enum: ['Male', 'Female', 'Kids'], required: true },
  garmentType: { type: String, required: true }, // e.g., 'Shirt', 'Lehenga'
  fields: [{
    fieldKey: { type: String, required: true },
    displayName: { type: String, required: true },
    category: { type: String }, // e.g., 'Upper Body', 'Lower Body'
    displayGroup: { type: String }, // e.g., 'Main', 'Details'
    inputType: { type: String, enum: ['number', 'text', 'select'], default: 'number' },
    placeholder: { type: String },
    defaultValue: { type: String },
    validationRules: { type: String },
    minimumValue: { type: Number },
    maximumValue: { type: Number },
    unit: { type: String, default: 'inches' },
    bodyZone: { type: String }, // For interactive diagram linking
    required: { type: Boolean, default: false },
    displayOrder: { type: Number, default: 0 }
  }]
}, { timestamps: true });

// Ensure uniqueness per garment/customer type
MeasurementTemplateSchema.index({ customerType: 1, garmentType: 1 }, { unique: true });

const CustomerMeasurementSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  garmentType: { type: String, required: true },
  // Map of String to Mixed (to allow Numbers for sizes, Strings for remarks)
  measurements: { type: Map, of: mongoose.Schema.Types.Mixed }, 
  version: { type: Number, default: 1 },
  lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const MeasurementVersionSchema = new mongoose.Schema({
  measurementId: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomerMeasurement', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  garmentType: { type: String, required: true },
  versionNumber: { type: Number, required: true },
  measurements: { type: Map, of: mongoose.Schema.Types.Mixed },
  changeReason: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

CustomerMeasurementSchema.index({ customerId: 1, garmentType: 1 });
MeasurementVersionSchema.index({ customerId: 1, garmentType: 1, versionNumber: -1 });

// Prevent mongoose from compiling the model multiple times (hot-reload fix)
if (mongoose.models.MeasurementTemplate) delete mongoose.models.MeasurementTemplate;
if (mongoose.models.CustomerMeasurement) delete mongoose.models.CustomerMeasurement;
if (mongoose.models.MeasurementVersion) delete mongoose.models.MeasurementVersion;

module.exports = {
  MeasurementTemplate: mongoose.model('MeasurementTemplate', MeasurementTemplateSchema),
  CustomerMeasurement: mongoose.model('CustomerMeasurement', CustomerMeasurementSchema),
  MeasurementVersion: mongoose.model('MeasurementVersion', MeasurementVersionSchema)
};

