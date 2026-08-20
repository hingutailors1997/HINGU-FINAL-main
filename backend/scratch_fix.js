const mongoose = require('mongoose');
const { Order } = require('./models/Order');
const Transaction = require('./models/Transaction');
const { Customer } = require('./models/CRM');

require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(async () => {
  console.log('Connected to DB');
  
  const order = await Order.findOne({ orderNumber: 'ORD-8007' });
  if (!order) {
    console.log('Order not found');
    process.exit(1);
  }

  // Check if transaction already exists for this advance
  const existing = await Transaction.findOne({ orderRef: order._id, amount: 220 });
  if (existing) {
    console.log('Transaction already exists for ORD-8007!');
    process.exit(0);
  }

  // Create the transaction
  const tx = new Transaction({
    transactionNumber: `TX-${Date.now()}`,
    type: 'Income',
    amount: 220,
    category: 'Order Payment',
    paymentMethod: 'Cash', // Or whatever it was
    description: `Payment collected for ORD-8007 (Prashant Bha)`,
    orderRef: order._id,
    customerRef: order.customerId
  });

  await tx.save();
  console.log('Successfully created the transaction!');

  // Fix the customer balance if needed
  if (order.customerId) {
    await Customer.findByIdAndUpdate(order.customerId, {
      $inc: { pendingBalance: -220 }
    });
    console.log('Updated customer balance.');
  }

  process.exit(0);
}).catch(console.error);
