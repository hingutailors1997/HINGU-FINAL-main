const mongoose = require('mongoose');

const fabricStockSchema = new mongoose.Schema({
  barcode: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  pricePerMeter: { type: Number, required: true },
  metersTotal: { type: Number, required: true },
  metersRemaining: { type: Number, required: true },
  color: { type: String },
  imageUrl: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('FabricStock', fabricStockSchema);
