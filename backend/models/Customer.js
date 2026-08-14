const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  customerId: { type: String, unique: true, sparse: true },
  fullName: { type: String, required: true },
  mobile: { type: String, required: true },
  whatsapp: { type: String },
  email: { type: String },
  gender: { type: String, enum: ['Male', 'Female', 'Kids', 'Other'] },
  dob: { type: Date },
  anniversary: { type: Date },
  occupation: { type: String },
  gstNumber: { type: String },
  preferredLanguage: { type: String },
  referenceBy: { type: String },
  
  address: {
    area: { type: String },
    city: { type: String },
    state: { type: String },
    country: { type: String },
    pincode: { type: String }
  },

  status: { type: String, enum: ['Active', 'Inactive', 'Blocked'], default: 'Active' },
  notes: { type: String },
  profilePhotoUrl: { type: String },

  // System Managed Fields
  customerSince: { type: Date, default: Date.now },
  lastVisit: { type: Date },
  lastOrderDate: { type: Date },
  lastMeasurementDate: { type: Date },
  
  totalOrders: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  pendingAmount: { type: Number, default: 0 },
  averageOrderValue: { type: Number, default: 0 },
  
  favoriteGarment: { type: String },
  favoriteTailor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  companyGroupId: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomerGroup' },
  employeeCode: { type: String },
  
  // Audit and Soft Delete
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Explicit database indexes for production performance & searching
customerSchema.index({ email: 1 });
customerSchema.index({ fullName: 1 });
customerSchema.index({ status: 1 });
customerSchema.index({ fullName: 'text', mobile: 'text', customerId: 'text', whatsapp: 'text', email: 'text', gstNumber: 'text' });

// Prevent mongoose from compiling the model multiple times (hot-reload fix)
if (mongoose.models.Customer) {
  delete mongoose.models.Customer;
}


module.exports = mongoose.model('Customer', customerSchema);
