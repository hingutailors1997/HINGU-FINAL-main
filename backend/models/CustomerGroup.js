const mongoose = require('mongoose');

const customerGroupSchema = new mongoose.Schema({
  groupName: { type: String, required: true, unique: true },
  contactPerson: { type: String },
  mobile: { type: String },
  email: { type: String },
  gstNumber: { type: String },
  address: {
    area: { type: String },
    city: { type: String },
    state: { type: String },
    country: { type: String },
    pincode: { type: String }
  },
  status: { type: String, enum: ['Active', 'Inactive', 'Blocked'], default: 'Active' },
  notes: { type: String },
  
  // Audit
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date }
}, { timestamps: true });

customerGroupSchema.index({ groupName: 1 });
customerGroupSchema.index({ groupName: 'text', contactPerson: 'text', mobile: 'text', gstNumber: 'text' });

if (mongoose.models.CustomerGroup) {
  delete mongoose.models.CustomerGroup;
}

module.exports = mongoose.model('CustomerGroup', customerGroupSchema);
