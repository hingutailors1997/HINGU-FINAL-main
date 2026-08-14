const express = require('express');
const router = express.Router();
const transactionService = require('../services/transactionService');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { sendSuccess, sendError } = require('../utils/response');

// GET all transactions with filtering, pagination, search, and live summary statistics
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const result = await transactionService.getTransactions(req.query);
    return sendSuccess(res, 200, 'Transactions and ledger stats fetched successfully', result);
  } catch (err) {
    return sendError(res, 500, 'Failed to retrieve ledger transactions', err.message);
  }
});

// GET aggregated real-time financial P&L summary
router.get('/summary/reports', authMiddleware, async (req, res, next) => {
  try {
    const summary = await transactionService.getFinancialSummary(req.query);
    return sendSuccess(res, 200, 'Financial P&L aggregation report generated successfully', summary);
  } catch (err) {
    return sendError(res, 500, 'Failed to compute financial summary reports', err.message);
  }
});

// GET transaction details by ID or transactionNumber
router.get('/:idOrNumber', authMiddleware, async (req, res, next) => {
  try {
    const tx = await transactionService.getTransactionById(req.params.idOrNumber);
    return sendSuccess(res, 200, 'Transaction details retrieved successfully', tx);
  } catch (err) {
    return sendError(res, 404, 'Transaction not found in ledger', err.message);
  }
});

// POST record new transaction (ACID transaction bounded)
router.post('/', authMiddleware, roleMiddleware(['owner', 'manager', 'admin', 'reception']), async (req, res, next) => {
  try {
    const newTx = await transactionService.createTransaction(req.body, req.user ? req.user._id : null);
    return sendSuccess(res, 201, 'Financial transaction recorded into MongoDB ledger successfully', newTx);
  } catch (err) {
    return sendError(res, 400, 'Failed to record transaction into ledger', err.message);
  }
});

// PUT update transaction details (ACID transaction bounded + audit logged)
router.put('/:id', authMiddleware, roleMiddleware(['owner', 'manager', 'admin']), async (req, res, next) => {
  try {
    const updatedTx = await transactionService.updateTransaction(req.params.id, req.body, req.user ? req.user._id : null);
    return sendSuccess(res, 200, 'Transaction details updated successfully', updatedTx);
  } catch (err) {
    return sendError(res, 400, 'Failed to update transaction details', err.message);
  }
});

// DELETE remove transaction and roll back any linked order advances
router.delete('/:id', authMiddleware, roleMiddleware(['owner', 'manager', 'admin']), async (req, res, next) => {
  try {
    const result = await transactionService.deleteTransaction(req.params.id, req.user ? req.user._id : null);
    return sendSuccess(res, 200, 'Transaction cleanly deleted and linked accounts reconciled', result);
  } catch (err) {
    console.error(`[Transaction Delete Route Error] ${req.params.id}:`, err);
    return sendError(res, 400, err.message || 'Failed to delete transaction', { error: err.message });
  }
});

module.exports = router;
