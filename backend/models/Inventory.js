const mongoose = require('mongoose');

const SupplierSchema = new mongoose.Schema({
  supplierId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  contactPerson: { type: String },
  phone: { type: String },
  email: { type: String },
  address: { type: String },
  gstNumber: { type: String }
}, { timestamps: true });

const FabricInventorySchema = new mongoose.Schema({
  fabricId: { type: String, required: true, unique: true },
  barcode: { type: String, unique: true, sparse: true },
  qrCode: { type: String, unique: true, sparse: true },
  name: { type: String, required: true },
  category: { type: String, required: true }, // Shirting, Suiting, etc.
  material: { type: String }, // Cotton, Linen
  color: { type: String },
  brand: { type: String },
  partyName: { type: String },
  width: { type: String },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  supplierName: { type: String },
  purchasePrice: { type: Number, default: 0 },
  sellingPrice: { type: Number, default: 0 },
  pricePerMeter: { type: Number, default: 0 },
  totalAvailable: { type: Number, default: 0 },
  reservedStock: { type: Number, default: 0 },
  usedStock: { type: Number, default: 0 },
  rackNumber: { type: String },
  shelfNumber: { type: String },
  warehouse: { type: String, default: 'Main Warehouse' },
  lotNumber: { type: String },
  rollNumber: { type: String },
  minimumStock: { type: Number, default: 10 },
  status: { type: String, enum: ['Active', 'Low Stock', 'Out of Stock', 'Depleted', 'Reserved'], default: 'Active' },
  imageUrl: { type: String },
  gallery: [{ type: String }],
  aiYieldRate: { type: Number, default: 2.2 } // Standard consumption rate in meters for garment calculation
}, { timestamps: true });

// Explicit database indexes for Fabric Inventory (Production ERP Standard)
FabricInventorySchema.index({ name: 1 });
FabricInventorySchema.index({ supplierId: 1 });
FabricInventorySchema.index({ category: 1 });
FabricInventorySchema.index({ warehouse: 1 });
FabricInventorySchema.index({ rackNumber: 1 });
FabricInventorySchema.index({ shelfNumber: 1 });
FabricInventorySchema.index({ status: 1 });
FabricInventorySchema.index({ name: 'text', fabricId: 'text', category: 'text', barcode: 'text', color: 'text', brand: 'text' });


const StockHistorySchema = new mongoose.Schema({
  fabricId: { type: mongoose.Schema.Types.ObjectId, ref: 'FabricInventory', required: true },
  barcode: { type: String, required: true },
  fabricName: { type: String },
  date: { type: Date, default: Date.now },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName: { type: String },
  qtyBefore: { type: Number, required: true },
  qtyChange: { type: Number, required: true }, // Negative for deduction, positive for addition
  qtyRemaining: { type: Number, required: true },
  reason: { type: String }, // 'Used for Order #123', 'Manual Adjustment'
  orderNumber: { type: String },
  deviceUsed: { type: String }
}, { timestamps: true });

const ScanHistorySchema = new mongoose.Schema({
  barcode: { type: String, required: true },
  date: { type: Date, default: Date.now },
  device: { type: String },
  browser: { type: String },
  ipAddress: { type: String },
  result: { type: String, enum: ['Success', 'Not Found', 'Error'] },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const FabricRollSchema = new mongoose.Schema({
  fabricId: { type: mongoose.Schema.Types.ObjectId, ref: 'FabricInventory', required: true },
  rollNumber: { type: String, required: true },
  barcode: { type: String, required: true, unique: true },
  qrCodeUrl: { type: String },
  lotNumber: { type: String },
  originalMeters: { type: Number, required: true },
  remainingMeters: { type: Number, required: true },
  reservedMeters: { type: Number, default: 0 },
  rackNumber: { type: String },
  shelfNumber: { type: String },
  status: { type: String, enum: ['Available', 'Low Stock', 'Out of Stock', 'Reserved'], default: 'Available' }
}, { timestamps: true });

// Explicit database indexes for Fabric Roll and QR/Barcodes
FabricRollSchema.index({ qrCodeUrl: 1 });
FabricRollSchema.index({ status: 1 });

const StockTransactionSchema = new mongoose.Schema({
  fabricRollId: { type: mongoose.Schema.Types.ObjectId, ref: 'FabricRoll', required: true },
  transactionType: { type: String, enum: ['Purchase', 'Reserve', 'Deduct', 'Return', 'Adjustment', 'Transfer'], required: true },
  meters: { type: Number, required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  notes: { type: String },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const BarcodeHistorySchema = new mongoose.Schema({
  barcode: { type: String, required: true },
  action: { type: String, required: true },
  scannedAt: { type: Date, default: Date.now },
  scannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const FabricConsumptionRuleSchema = new mongoose.Schema({
  garmentType: { type: String, required: true, unique: true },
  baseMeters: { type: Number, required: true },
  widthMultipliers: { type: Map, of: Number, default: () => ({ '58"': 1.0, '44"': 1.25, '36"': 1.40 }) },
  fitMultipliers: { type: Map, of: Number, default: () => ({ 'Regular': 1.0, 'Slim': 0.95, 'Baggy': 1.15, 'Anarkali': 1.20 }) },
  wastePercentage: { type: Number, default: 5.5 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const SupplierBillSchema = new mongoose.Schema({
  billNumber: { type: String, required: true, unique: true },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  billDate: { type: Date, required: true },
  dueDate: { type: Date, required: true },
  totalAmount: { type: Number, required: true, default: 0 },
  amountPaid: { type: Number, default: 0 },
  status: { type: String, enum: ['Unpaid', 'Partial', 'Paid', 'Overdue'], default: 'Unpaid' },
  fabricItems: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FabricInventory' }],
  notified: { type: Boolean, default: false }
}, { timestamps: true });

SupplierBillSchema.index({ dueDate: 1, status: 1 });
SupplierBillSchema.index({ supplierId: 1 });

module.exports = {
  Supplier: mongoose.models.Supplier || mongoose.model('Supplier', SupplierSchema),
  FabricInventory: mongoose.models.FabricInventory || mongoose.model('FabricInventory', FabricInventorySchema),
  StockHistory: mongoose.models.StockHistory || mongoose.model('StockHistory', StockHistorySchema),
  ScanHistory: mongoose.models.ScanHistory || mongoose.model('ScanHistory', ScanHistorySchema),
  FabricRoll: mongoose.models.FabricRoll || mongoose.model('FabricRoll', FabricRollSchema),
  StockTransaction: mongoose.models.StockTransaction || mongoose.model('StockTransaction', StockTransactionSchema),
  BarcodeHistory: mongoose.models.BarcodeHistory || mongoose.model('BarcodeHistory', BarcodeHistorySchema),
  FabricConsumptionRule: mongoose.models.FabricConsumptionRule || mongoose.model('FabricConsumptionRule', FabricConsumptionRuleSchema),
  SupplierBill: mongoose.models.SupplierBill || mongoose.model('SupplierBill', SupplierBillSchema)
};
