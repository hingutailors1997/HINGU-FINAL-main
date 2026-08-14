const mongoose = require('mongoose');
const { Order } = require('./backend/models/Order');

mongoose.connect('mongodb://127.0.0.1:27017/hingu_erp', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const orders = await Order.find().select('_id orderNumber customerId');
    console.log(orders);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
