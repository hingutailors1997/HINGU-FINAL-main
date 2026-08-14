const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['owner', 'manager', 'tailor', 'receptionist'], default: 'tailor' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  lastLogin: { type: Date }
}, { timestamps: true });

const EmployeeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  employeeId: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  phone: { type: String },
  designation: { type: String },
  joiningDate: { type: Date },
  baseSalary: { type: Number },
  documents: [{ name: String, url: String }]
}, { timestamps: true });

module.exports = {
  User: mongoose.model('User', UserSchema),
  Employee: mongoose.model('Employee', EmployeeSchema)
};
