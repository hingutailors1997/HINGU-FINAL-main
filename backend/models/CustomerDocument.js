const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
  
  fileUrl: { type: String, required: true }, // Cloudinary URL
  publicId: { type: String, required: true },
  
  documentType: { 
    type: String, 
    enum: ['GST', 'PAN', 'Aadhaar', 'Invoice', 'Receipt', 'Reference PDF', 'Measurement PDF', 'Other'],
    required: true
  },
  
  documentName: { type: String }, // e.g., "Aadhaar Front"
  description: { type: String },
  
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

if (mongoose.models.CustomerDocument) {
  delete mongoose.models.CustomerDocument;
}

module.exports = mongoose.model('CustomerDocument', documentSchema);
