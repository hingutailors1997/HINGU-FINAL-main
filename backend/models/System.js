const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true }, // e.g., 'CREATE_ORDER'
  entityType: { type: String, required: true }, // e.g., 'Order'
  entityId: { type: mongoose.Schema.Types.ObjectId },
  details: { type: String },
  ipAddress: { type: String },
  device: { type: String }
}, { timestamps: true });

const AuditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  collectionName: { type: String, required: true },
  documentId: { type: mongoose.Schema.Types.ObjectId, required: true },
  oldValue: { type: mongoose.Schema.Types.Mixed },
  newValue: { type: mongoose.Schema.Types.Mixed },
  action: { type: String, enum: ['CREATE', 'UPDATE', 'DELETE'], required: true }
}, { timestamps: true });

const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  link: { type: String },
  type: { type: String, enum: ['Info', 'Warning', 'Alert', 'Success'], default: 'Info' },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

const SettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  group: { type: String }
}, { timestamps: true });

const ReportSchema = new mongoose.Schema({
  reportName: { type: String, required: true },
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  pdfUrl: { type: String },
  csvUrl: { type: String }
}, { timestamps: true });

module.exports = {
  ActivityLog: mongoose.models.ActivityLog || mongoose.model('ActivityLog', ActivityLogSchema),
  AuditLog: mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema),
  Notification: mongoose.models.Notification || mongoose.model('Notification', NotificationSchema),
  Setting: mongoose.models.Setting || mongoose.model('Setting', SettingSchema),
  Report: mongoose.models.Report || mongoose.model('Report', ReportSchema)
};

