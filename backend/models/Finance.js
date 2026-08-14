const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  issueDate: { type: Date, default: Date.now },
  dueDate: { type: Date },
  subtotal: { type: Number, required: true },
  taxAmount: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ['Draft', 'Issued', 'Partially Paid', 'Paid', 'Cancelled'], default: 'Draft' },
  pdfData: { type: Buffer },
  pdfMimeType: { type: String, default: 'application/pdf' }
}, { timestamps: true });

// Explicit database indexes for production query performance
InvoiceSchema.index({ customerId: 1, status: 1 });
InvoiceSchema.index({ issueDate: -1 });

const PaymentSchema = new mongoose.Schema({
  paymentId: { type: String, required: true, unique: true },
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['Cash', 'UPI', 'Bank Transfer', 'Card'], required: true },
  paymentDate: { type: Date, default: Date.now },
  referenceNumber: { type: String }, // UPI transaction ID, etc.
  notes: { type: String },
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const ReceiptSchema = new mongoose.Schema({
  receiptNumber: { type: String, required: true, unique: true },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', required: true },
  pdfUrl: { type: String }
}, { timestamps: true });

const ExpenseSchema = new mongoose.Schema({
  expenseId: { type: String, required: true, unique: true },
  category: { type: String, required: true }, // e.g., 'Rent', 'Electricity', 'Supplies'
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  paymentMethod: { type: String },
  reference: { type: String },
  description: { type: String },
  receiptUrl: { type: String },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const IncomeSchema = new mongoose.Schema({
  incomeId: { type: String, required: true, unique: true },
  source: { type: String, required: true }, // usually 'Sales'
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' }
}, { timestamps: true });

module.exports = {
  Invoice: mongoose.models.Invoice || mongoose.model('Invoice', InvoiceSchema),
  Payment: mongoose.models.Payment || mongoose.model('Payment', PaymentSchema),
  Receipt: mongoose.models.Receipt || mongoose.model('Receipt', ReceiptSchema),
  Expense: mongoose.models.Expense || mongoose.model('Expense', ExpenseSchema),
  Income: mongoose.models.Income || mongoose.model('Income', IncomeSchema)
};
