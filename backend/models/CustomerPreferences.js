const mongoose = require('mongoose');

const preferenceSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, unique: true },
  
  preferredFit: { type: String },
  preferredCollar: { type: String },
  preferredSleeve: { type: String },
  preferredPocket: { type: String },
  preferredBottomWidth: { type: String },
  preferredPantRise: { type: String },
  
  preferredFabricBrand: { type: String },
  preferredColours: [{ type: String }],
  preferredButtons: { type: String },
  preferredEmbroidery: { type: String },
  preferredStitchType: { type: String },
  
  preferredTailor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  preferredDeliveryMethod: { type: String },
  preferredCommunicationMethod: { type: String, enum: ['WhatsApp', 'SMS', 'Email', 'Call'] },
  preferredTrialDays: { type: Number },
  preferredOccasion: { type: String },
  
  specialInstructions: { type: String }
}, { timestamps: true });

if (mongoose.models.CustomerPreference) {
  delete mongoose.models.CustomerPreference;
}

module.exports = mongoose.model('CustomerPreference', preferenceSchema);
