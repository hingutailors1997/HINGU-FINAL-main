const mongoose = require('mongoose');

const Customer = require('./Customer');
const CustomerGroup = require('./CustomerGroup');

const CustomerGallerySchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  category: { type: String, enum: ['Profile', 'Front Body', 'Back Body', 'Side Body', 'Reference', 'Fabric', 'Completed Garment', 'Trial', 'WhatsApp', 'Other'], required: true },
  fileName: { type: String, required: true },
  fileUrl: { type: String, required: true }, // Cloudinary URL
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String },
  tags: [{ type: String }]
}, { timestamps: true });

const DocumentSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  documentType: { type: String, enum: ['Aadhar', 'GST', 'Invoice', 'Measurement PDF', 'Design PDF', 'Other'], required: true },
  fileName: { type: String, required: true },
  fileUrl: { type: String, required: true }, // Cloudinary URL
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = {
  Customer,
  CustomerGroup,
  CustomerGallery: mongoose.models.CustomerGallery || mongoose.model('CustomerGallery', CustomerGallerySchema),
  Document: mongoose.models.Document || mongoose.model('Document', DocumentSchema)
};
