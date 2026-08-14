const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ['Present', 'Absent', 'Half Day', 'Leave'], required: true },
  checkIn: { type: Date },
  checkOut: { type: Date },
  notes: { type: String }
}, { timestamps: true });

const SalarySchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  baseAmount: { type: Number, required: true },
  deductions: { type: Number, default: 0 },
  bonuses: { type: Number, default: 0 },
  netPayable: { type: Number, required: true },
  status: { type: String, enum: ['Pending', 'Paid'], default: 'Pending' },
  paymentDate: { type: Date },
  paymentMethod: { type: String }
}, { timestamps: true });

const PaymentSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  paymentPeriodStart: { type: Date, required: true },
  paymentPeriodEnd: { type: Date, required: true },
  grossAmount: { type: Number, required: true, default: 0 },
  alreadyPaidBefore: { type: Number, required: true, default: 0 },
  paymentAmount: { type: Number, required: true },
  remainingAfterPayment: { type: Number, required: true, default: 0 },
  paymentMethod: { type: String, enum: ['Cash', 'UPI', 'Bank Transfer', 'Cheque'], default: 'Cash' },
  referenceNumber: { type: String },
  notes: { type: String },
  createdBy: { type: String, default: 'Owner/Admin' },
  // Future-ready architectural extensions without changing DB structure:
  payrollCycle: { type: String, enum: ['Weekly', 'Bi-Weekly', 'Monthly'], default: 'Weekly' },
  bonusAmount: { type: Number, default: 0 },
  penaltyAmount: { type: Number, default: 0 },
  advancePayment: { type: Number, default: 0 },
  festivalBonus: { type: Number, default: 0 },
  attendanceDeduction: { type: Number, default: 0 }
}, { timestamps: true });

const EmployeeSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String },
  mobile: { type: String, required: true },
  role: { type: String, required: true, enum: ['Master', 'Tailor', 'Cutter', 'Finisher', 'Other'] },
  baseSalary: { type: Number, default: 0 },
  joinDate: { type: Date, default: Date.now },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
}, { timestamps: true });

const DailyWorkLogSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  date: { type: Date, required: true },
  rateMasterId: { type: mongoose.Schema.Types.ObjectId, ref: 'RateMaster' },
  rateSnapshot: { type: Number, default: 0 },
  quantity: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  category: { type: String },
  garmentName: { type: String },
  variant: { type: String },
  workType: { type: String },
  // Legacy fields retained for backward UI compatibility
  garmentsCompleted: { type: Number, default: 0 },
  productType: { type: String, default: 'General' },
  baseRatePerPiece: { type: Number, default: 0 },
  patternWorkQty: { type: Number, default: 0 },
  patternCommissionRate: { type: Number, default: 20 },
  details: { type: String }, // Optional Job Notes / details
  pieceRateEarned: { type: Number, default: 0 },
}, { timestamps: true });

const RateMasterSchema = new mongoose.Schema({
  category: { type: String, required: true },
  garmentName: { type: String, required: true },
  variant: { type: String, default: 'Standard' },
  workType: { type: String, required: true, default: 'Stitching' },
  rate: { type: Number, required: true },
  effectiveDate: { type: Date, default: Date.now },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  remarks: { type: String },
  createdBy: { type: String, default: 'Owner/Admin' },
  history: [{
    rate: { type: Number, required: true },
    effectiveDate: { type: Date, default: Date.now },
    status: { type: String },
    remarks: { type: String },
    changedBy: { type: String, default: 'Owner/Admin' },
    changedAt: { type: Date, default: Date.now },
    action: { type: String }
  }]
}, { timestamps: true });

delete mongoose.models.Employee;
delete mongoose.connection.models.Employee;
const Employee = mongoose.model('Employee', EmployeeSchema);

delete mongoose.models.DailyWorkLog;
delete mongoose.connection.models.DailyWorkLog;
const DailyWorkLog = mongoose.model('DailyWorkLog', DailyWorkLogSchema);

delete mongoose.models.Attendance;
delete mongoose.connection.models.Attendance;
const Attendance = mongoose.model('Attendance', AttendanceSchema);

delete mongoose.models.Salary;
delete mongoose.connection.models.Salary;
const Salary = mongoose.model('Salary', SalarySchema);

delete mongoose.models.Payment;
delete mongoose.connection.models.Payment;
const Payment = mongoose.model('Payment', PaymentSchema);

delete mongoose.models.RateMaster;
delete mongoose.connection.models.RateMaster;
const RateMaster = mongoose.model('RateMaster', RateMasterSchema);

module.exports = {
  Employee,
  DailyWorkLog,
  Attendance,
  Salary,
  Payment,
  RateMaster
};
