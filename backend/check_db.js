const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://danishchovatiya922:hBvL5wP1mSgR0sUf@cluster0.db108.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')
  .then(async () => {
    const db = mongoose.connection.db;
    const orders = await db.collection('orders').find().toArray();
    console.log('Orders Count:', orders.length);
    if(orders.length > 0) {
      console.log('Total Amount of all orders:', orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0));
    }
    const txs = await db.collection('transactions').find().toArray();
    console.log('Txs Count:', txs.length);
    const fabric = await db.collection('fabrics').find().toArray();
    console.log('Fabrics Count:', fabric.length);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
