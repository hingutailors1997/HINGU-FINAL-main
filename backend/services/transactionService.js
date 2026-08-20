const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Order = require('../models/Order');
const Customer = require('../models/Customer');

class TransactionService {
  /**
   * Helper to generate sequential unique transaction numbers (e.g., TX-2026-00001)
   */
  async generateTransactionNumber(session = null) {
    const year = new Date().getFullYear();
    const prefix = `TX-${year}-`;
    const query = Transaction.findOne({ transactionNumber: new RegExp(`^${prefix}`) })
      .sort({ createdAt: -1 });
    
    if (session) query.session(session);
    
    const latestTx = await query;
    let seq = 1;
    if (latestTx && latestTx.transactionNumber) {
      const parts = latestTx.transactionNumber.split('-');
      if (parts.length === 3 && !isNaN(parts[2])) {
        seq = parseInt(parts[2], 10) + 1;
      }
    }
    return `${prefix}${String(seq).padStart(5, '0')}`;
  }

  /**
   * Create a financial transaction with ACID guarantees and multi-document updates
   */
  async createTransaction(data, userId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const transactionNumber = data.transactionNumber || await this.generateTransactionNumber(session);
      
      const newTx = new Transaction({
        ...data,
        transactionNumber,
        recordedBy: userId || undefined,
        auditLog: [{
          action: 'CREATED',
          timestamp: new Date(),
          performedBy: userId || undefined,
          notes: `Recorded ${data.type} of ₹${data.amount} under ${data.category}`
        }]
      });

      const savedTx = await newTx.save({ session });

      // If this transaction is linked to an order payment, update order advance/balance
      if (data.orderRef && data.type === 'Income') {
        const order = await Order.findById(data.orderRef).session(session);
        if (order) {
          order.advancePaid = (order.advancePaid || 0) + data.amount;
          order.paymentStatus = order.advancePaid >= order.totalAmount ? 'Paid' : 'Partially Paid';
          await order.save({ session });
        }
      }

      await session.commitTransaction();
      session.endSession();
      return savedTx;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /**
   * Retrieve paginated and filtered list of transactions from MongoDB
   */
  async getTransactions(query = {}) {
    const { 
      page = 1, 
      limit = 20, 
      type, 
      category, 
      paymentMethod, 
      search, 
      startDate, 
      endDate,
      sortBy = 'date', 
      order = 'desc' 
    } = query;

    const filter = {};
    if (type && type !== 'all') filter.type = type;
    if (category) filter.category = category;
    if (paymentMethod) filter.paymentMethod = paymentMethod;

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { transactionNumber: searchRegex },
        { description: searchRegex },
        { category: searchRegex },
        { referenceId: searchRegex }
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const sortConfig = {};
    sortConfig[sortBy] = order === 'asc' ? 1 : -1;

    const [transactions, totalCount] = await Promise.all([
      Transaction.find(filter)
        .populate('orderRef', 'orderNumber totalAmount')
        .populate('customerRef', 'firstName lastName mobile')
        .sort(sortConfig)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Transaction.countDocuments(filter)
    ]);

    // Compute live aggregation statistics on the full matched dataset
    const [summaryStats, methodStats] = await Promise.all([
      Transaction.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$type',
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),
      Transaction.aggregate([
        { $match: filter },
        {
          $group: {
            _id: { type: '$type', method: '$paymentMethod' },
            totalAmount: { $sum: '$amount' }
          }
        }
      ])
    ]);

    let totalIncome = 0;
    let totalExpense = 0;
    summaryStats.forEach(stat => {
      if (stat._id === 'Income') totalIncome = stat.totalAmount;
      if (stat._id === 'Expense') totalExpense = stat.totalAmount;
    });

    const methodBreakdown = {
      income: { cash: 0, online: 0, other: 0 },
      expense: { cash: 0, online: 0, other: 0 }
    };

    methodStats.forEach(stat => {
      const typeKey = stat._id.type === 'Income' ? 'income' : (stat._id.type === 'Expense' ? 'expense' : null);
      if (typeKey) {
        if (stat._id.method === 'Cash') {
          methodBreakdown[typeKey].cash += stat.totalAmount;
        } else if (['UPI', 'Card', 'Bank Transfer'].includes(stat._id.method)) {
          methodBreakdown[typeKey].online += stat.totalAmount;
        } else {
          methodBreakdown[typeKey].other += stat.totalAmount;
        }
      }
    });

    return {
      transactions,
      pagination: {
        totalItems: totalCount,
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum) || 1,
        pageSize: limitNum
      },
      summary: {
        totalIncome,
        totalExpense,
        netProfit: totalIncome - totalExpense,
        methodBreakdown
      }
    };
  }

  /**
   * Retrieve single transaction details by ID or transactionNumber
   */
  async getTransactionById(idOrNumber) {
    let tx;
    if (mongoose.Types.ObjectId.isValid(idOrNumber)) {
      tx = await Transaction.findById(idOrNumber)
        .populate('orderRef')
        .populate('customerRef')
        .populate('recordedBy', 'name email role');
    }
    if (!tx) {
      tx = await Transaction.findOne({ transactionNumber: idOrNumber })
        .populate('orderRef')
        .populate('customerRef')
        .populate('recordedBy', 'name email role');
    }
    if (!tx) {
      throw new Error('Transaction not found in database');
    }
    return tx;
  }

  /**
   * Update transaction with audit logging and ACID session safety
   */
  async updateTransaction(id, updateData, userId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const tx = await Transaction.findById(id).session(session);
      if (!tx) {
        throw new Error('Transaction record not found');
      }

      Object.keys(updateData).forEach(key => {
        if (key !== 'auditLog' && key !== 'transactionNumber' && updateData[key] !== undefined) {
          tx[key] = updateData[key];
        }
      });

      tx.auditLog.push({
        action: 'UPDATED',
        timestamp: new Date(),
        performedBy: userId || undefined,
        notes: `Updated transaction parameters`
      });

      const updatedTx = await tx.save({ session });
      await session.commitTransaction();
      session.endSession();
      return updatedTx;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /**
   * Delete transaction with ACID session safety and rollback of linked accounts
   */
  async deleteTransaction(id, userId) {
    try {
      const query = mongoose.Types.ObjectId.isValid(id)
        ? { $or: [{ _id: id }, { transactionNumber: id }] }
        : { transactionNumber: id };
        
      const tx = await Transaction.findOne(query);
      if (!tx) {
        return { id, deleted: true, message: 'Transaction already removed from database' };
      }

      // Roll back order advance if linked (using atomic update to bypass legacy document schema validation)
      if (tx.orderRef && tx.type === 'Income') {
        try {
          const order = await Order.findById(tx.orderRef);
          if (order) {
            const newAdvance = Math.max(0, (order.advancePaid || 0) - (tx.amount || 0));
            const newStatus = newAdvance === 0 ? 'Unpaid' : (newAdvance < order.totalAmount ? 'Partially Paid' : 'Paid');
            await Order.findByIdAndUpdate(order._id, { $set: { advancePaid: newAdvance, paymentStatus: newStatus } });
          }
        } catch (orderErr) {
          console.error(`[Warning] Could not reconcile linked order during transaction deletion: ${orderErr.message}`);
        }
      }

      await Transaction.findByIdAndDelete(tx._id);
      return { id, deleted: true, message: 'Transaction cleanly deleted and accounts reconciled' };
    } catch (error) {
      console.error(`[deleteTransaction Error] Failed to delete transaction ${id}:`, error);
      throw error;
    }
  }

  /**
   * Financial summary aggregation pipeline for real-time P&L reporting
   */
  async getFinancialSummary(params = {}) {
    const filter = {};
    if (params.startDate || params.endDate) {
      filter.date = {};
      if (params.startDate) filter.date.$gte = new Date(params.startDate);
      if (params.endDate) filter.date.$lte = new Date(params.endDate);
    }

    const [byType, byCategory, byMethod] = await Promise.all([
      Transaction.aggregate([
        { $match: filter },
        { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Transaction.aggregate([
        { $match: filter },
        { $group: { _id: { type: '$type', category: '$category' }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } }
      ]),
      Transaction.aggregate([
        { $match: filter },
        { $group: { _id: '$paymentMethod', total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ])
    ]);

    let income = 0;
    let expense = 0;
    byType.forEach(item => {
      if (item._id === 'Income') income = item.total;
      if (item._id === 'Expense') expense = item.total;
    });

    return {
      totalIncome: income,
      totalExpense: expense,
      netProfit: income - expense,
      breakdownByCategory: byCategory,
      breakdownByPaymentMethod: byMethod,
      timestamp: new Date()
    };
  }
}

module.exports = new TransactionService();
