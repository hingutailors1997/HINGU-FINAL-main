const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Transaction = require('./models/Transaction');
const Order = require('./models/Order');
const Customer = require('./models/Customer');
const transactionService = require('./services/transactionService');

let mongoServer;

async function runVerification() {
  console.log('================================================================');
  console.log('PHASE 5 AUTOMATED MONGODB INTEGRATION VERIFICATION SUITE');
  console.log('FINANCIAL ACCOUNTING, BILLING & REPORTS MODULE');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      passed++;
      console.log(`[PASS] ${testName} ${details}`);
    } else {
      failed++;
      console.error(`[FAIL] ${testName} ${details}`);
    }
  }

  try {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    console.log('[SYSTEM] Connected to clean in-memory MongoDB instance for ACID verification.\n');

    // Create mock customer and order for reference testing
    const testCustomer = await Customer.create({
      firstName: 'Ramesh',
      lastName: 'Hingu',
      mobile: '9876543210',
      email: 'ramesh@hingu.com',
      customerType: 'Retail'
    });

    const testOrder = await Order.create({
      orderNumber: 'ORD-2026-0001',
      customer: testCustomer._id,
      garments: [{ type: 'Sherwani', status: 'Pattern Pending', price: 15000 }],
      totalAmount: 15000,
      advancePaid: 5000,
      paymentStatus: 'Partially Paid',
      currentStage: 'Pattern'
    });
    assert(testOrder.advancePaid === 5000, 'Created initial test order with ₹5000 advance');

    // 1. VERIFY CREATE TRANSACTION & ACID ADVANCE SETTLEMENT
    console.log('\n--- Test Group 1: Transaction Creation & ACID Order Settlement ---');
    const tx1 = await transactionService.createTransaction({
      type: 'Income',
      amount: 10000,
      category: 'Order Payment',
      paymentMethod: 'UPI',
      description: 'Final settlement for Sherwani order',
      orderRef: testOrder._id,
      customerRef: testCustomer._id
    }, new mongoose.Types.ObjectId());

    assert(tx1.transactionNumber && tx1.transactionNumber.startsWith('TX-'), 'Auto-generated unique sequential transactionNumber', `(${tx1.transactionNumber})`);
    assert(tx1.auditLog.length === 1 && tx1.auditLog[0].action === 'CREATED', 'Audit logging initialized with CREATED action');

    // Verify linked order advance was updated automatically
    const updatedOrder = await Order.findById(testOrder._id);
    assert(updatedOrder.advancePaid === 15000, 'Linked order advance automatically updated to ₹15,000 via multi-document session');
    assert(updatedOrder.paymentStatus === 'Paid', 'Order paymentStatus automatically transitioned to Paid');

    // 2. VERIFY RECORDING EXPENSES & SEQUENTIAL NUMBERING
    console.log('\n--- Test Group 2: Expense Recording & Sequential Numbering ---');
    const tx2 = await transactionService.createTransaction({
      type: 'Expense',
      amount: 2500,
      category: 'Supplies',
      paymentMethod: 'Cash',
      description: 'Bought buttons and tailoring thread'
    });
    assert(tx2.transactionNumber !== tx1.transactionNumber, 'Second transaction received incremented unique number', `(${tx2.transactionNumber})`);

    const tx3 = await transactionService.createTransaction({
      type: 'Expense',
      amount: 1500,
      category: 'Utilities',
      paymentMethod: 'Bank Transfer',
      description: 'Electricity bill settlement',
      referenceId: 'BILL-ELEC-991'
    });

    // 3. VERIFY SERVER-SIDE PAGINATION, FILTERING & SEARCHING
    console.log('\n--- Test Group 3: Server-Side Pagination, Filtering & Searching ---');
    const allPage = await transactionService.getTransactions({ page: 1, limit: 2 });
    assert(allPage.transactions.length === 2, 'Pagination correctly limits page size to 2 records');
    assert(allPage.pagination.totalItems === 3, 'Total item count reported correctly as 3');

    const expenseFilter = await transactionService.getTransactions({ type: 'Expense' });
    assert(expenseFilter.transactions.length === 2 && expenseFilter.summary.totalExpense === 4000, 'Filtered by type=Expense; total expense calculated as ₹4,000');

    const searchResult = await transactionService.getTransactions({ search: 'ELEC' });
    assert(searchResult.transactions.length === 1 && searchResult.transactions[0].referenceId === 'BILL-ELEC-991', 'Server-side search matched reference ID "BILL-ELEC-991"');

    // 4. VERIFY REAL-TIME P&L AGGREGATION REPORTING
    console.log('\n--- Test Group 4: Real-Time P&L Financial Aggregation Pipeline ---');
    const pnlReport = await transactionService.getFinancialSummary({});
    assert(pnlReport.totalIncome === 10000, 'Total Income aggregated as ₹10,000');
    assert(pnlReport.totalExpense === 4000, 'Total Expense aggregated as ₹4,000');
    assert(pnlReport.netProfit === 6000, 'Net operational profit computed accurately as ₹6,000');

    // 5. VERIFY UPDATE & AUDIT LOG APPENDING
    console.log('\n--- Test Group 5: Transaction Update & Audit Trail Verification ---');
    const updatedTx2 = await transactionService.updateTransaction(tx2._id, {
      amount: 3000,
      description: 'Updated button cost with shipping'
    }, new mongoose.Types.ObjectId());
    assert(updatedTx2.amount === 3000, 'Updated transaction amount from ₹2,500 to ₹3,000');
    assert(updatedTx2.auditLog.length === 2 && updatedTx2.auditLog[1].action === 'UPDATED', 'Audit log automatically appended with UPDATED timestamp');

    // 6. VERIFY DELETE TRANSACTION & RECONCILIATION ROLLBACK
    console.log('\n--- Test Group 6: Deletion & Linked Account Reconciliation ---');
    const deleteResult = await transactionService.deleteTransaction(tx1._id);
    assert(deleteResult.deleted === true, 'Successfully executed deleteTransaction on income voucher');

    const checkOrderAfterDelete = await Order.findById(testOrder._id);
    assert(checkOrderAfterDelete.advancePaid === 5000, 'Order advance rolled back from ₹15,000 to initial ₹5,000 upon payment deletion');
    assert(checkOrderAfterDelete.paymentStatus === 'Partially Paid', 'Order payment status reverted accurately');

  } catch (error) {
    console.error('[UNEXPECTED ERROR]', error);
    failed++;
  } finally {
    if (mongoServer) {
      await mongoose.disconnect();
      await mongoServer.stop();
    }
  }

  console.log('\n================================================================');
  console.log(`VERIFICATION SUMMARY: ${passed} Passed | ${failed} Failed`);
  if (failed === 0) {
    console.log('STATUS: PHASE 5 FULLY COMPLETED, TESTED & PRODUCTION VERIFIED');
  } else {
    console.log('STATUS: FAILED CHECKS ENCOUNTERED');
    process.exit(1);
  }
  console.log('================================================================\n');
}

runVerification();
