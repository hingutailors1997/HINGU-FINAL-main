const mongoose = require('mongoose');

const gallerySchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
  
  fileUrl: { type: String, required: true }, // Cloudinary URL
  publicId: { type: String, required: true }, // Cloudinary Public ID for deletion
  
  category: { 
    type: String, 
    enum: ['Front', 'Back', 'Left', 'Right', 'Reference Design', 'WhatsApp Screenshot', 'Fabric', 'Before Alteration', 'After Alteration', 'Completed Garment', 'Video', 'Other'],
    required: true
  },
  
  description: { type: String },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

if (mongoose.models.CustomerGallery) {
  delete mongoose.models.CustomerGallery;
}

module.exports = mongoose.model('CustomerGallery', gallerySchema);
