const mongoose = require('mongoose');

async function checkData() {
  await mongoose.connect('mongodb://localhost:27017/hingu-tailors', { useNewUrlParser: true, useUnifiedTopology: true });
  
  const Transaction = require('./backend/models/Transaction');
  const Order = require('./backend/models/Order').Order;
  const Customer = require('./backend/models/Customer');

  const txs = await Transaction.find({});
  const orders = await Order.find({});
  const customers = await Customer.find({});

  console.log(`Found ${txs.length} transactions.`);
  if (txs.length > 0) {
    console.log('Sample transaction:', txs[0]);
  }

  console.log(`Found ${orders.length} orders.`);
  if (orders.length > 0) {
    console.log('Sample order total:', orders[0].totalAmount, 'advancePaid:', orders[0].advancePaid);
  }

  console.log(`Found ${customers.length} customers.`);

  mongoose.disconnect();
}

checkData().catch(console.error);
