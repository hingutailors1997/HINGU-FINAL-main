const express = require('express');
const router = express.Router();
const { CustomerGroup, Customer } = require('../models/CRM');
const { authMiddleware } = require('../middleware/auth');
const { sendSuccess, sendError } = require('../utils/response');

// GET all groups
router.get('/', authMiddleware, async (req, res) => {
  try {
    const groups = await CustomerGroup.find({ isDeleted: false }).sort({ groupName: 1 });
    return sendSuccess(res, 200, 'Groups fetched successfully', groups);
  } catch (err) {
    return sendError(res, 500, 'Failed to fetch groups', err);
  }
});

// GET group by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const group = await CustomerGroup.findById(req.params.id);
    if (!group || group.isDeleted) {
      return sendError(res, 404, 'Group not found');
    }
    return sendSuccess(res, 200, 'Group fetched successfully', group);
  } catch (err) {
    return sendError(res, 500, 'Failed to fetch group', err);
  }
});

// GET employees of a group
router.get('/:id/employees', authMiddleware, async (req, res) => {
  try {
    const employees = await Customer.find({ companyGroupId: req.params.id, isDeleted: false }).sort({ createdAt: -1 });
    return sendSuccess(res, 200, 'Group employees fetched successfully', employees);
  } catch (err) {
    return sendError(res, 500, 'Failed to fetch group employees', err);
  }
});

// CREATE new group
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { groupName, contactPerson, mobile, email, gstNumber, address } = req.body;
    
    // Check for duplicates
    const existingGroup = await CustomerGroup.findOne({ groupName: { $regex: new RegExp(`^${groupName}$`, 'i') }, isDeleted: false });
    if (existingGroup) {
      return sendError(res, 400, 'A group with this name already exists');
    }

    const newGroup = new CustomerGroup({
      groupName,
      contactPerson,
      mobile,
      email,
      gstNumber,
      address,
      createdBy: req.user._id
    });
    
    await newGroup.save();
    return sendSuccess(res, 201, 'Group created successfully', newGroup);
  } catch (err) {
    if (err.code === 11000) {
      return sendError(res, 400, 'A group with this name already exists');
    }
    return sendError(res, 500, 'Failed to create group', err);
  }
});

// UPDATE group
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const group = await CustomerGroup.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user._id },
      { new: true, runValidators: true }
    );
    if (!group) return sendError(res, 404, 'Group not found');
    return sendSuccess(res, 200, 'Group updated successfully', group);
  } catch (err) {
    return sendError(res, 500, 'Failed to update group', err);
  }
});

// DELETE group (soft delete)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const group = await CustomerGroup.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true, deletedAt: new Date(), deletedBy: req.user._id },
      { new: true }
    );
    if (!group) return sendError(res, 404, 'Group not found');
    return sendSuccess(res, 200, 'Group deleted successfully', group);
  } catch (err) {
    return sendError(res, 500, 'Failed to delete group', err);
  }
});

module.exports = router;
