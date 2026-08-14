const mongoose = require('mongoose');

const timelineSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
  
  action: { type: String, required: true }, // e.g., 'Customer Created', 'Measurement Updated'
  description: { type: String },
  
  relatedEntityModel: { type: String }, // e.g., 'Order', 'MeasurementVersion', 'Transaction'
  relatedEntityId: { type: mongoose.Schema.Types.ObjectId },
  
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  metadata: {
    device: { type: String },
    ip: { type: String },
    details: { type: mongoose.Schema.Types.Mixed }
  }
}, { timestamps: true });

timelineSchema.index({ customerId: 1, createdAt: -1 });

if (mongoose.models.CustomerTimeline) {
  delete mongoose.models.CustomerTimeline;
}

module.exports = mongoose.model('CustomerTimeline', timelineSchema);
