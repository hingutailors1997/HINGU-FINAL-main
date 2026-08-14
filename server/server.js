const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'db.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// Helper to read DB
function readDb() {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading db.json:', err);
    return {};
  }
}

// Helper to write DB
function writeDb(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing db.json:', err);
    return false;
  }
}

/* REST API ENDPOINTS */

// Get full state
app.get('/api/data', (req, res) => {
  const db = readDb();
  res.json(db);
});

// Customers
app.get('/api/customers', (req, res) => {
  const db = readDb();
  res.json(db.customers || []);
});

app.post('/api/customers', (req, res) => {
  const db = readDb();
  const customer = req.body;
  db.customers = db.customers || [];
  
  const idx = db.customers.findIndex(c => c.id === customer.id);
  if (idx >= 0) {
    db.customers[idx] = customer;
  } else {
    db.customers.unshift(customer);
  }

  writeDb(db);
  res.json({ success: true, customer });
});

// Orders
app.get('/api/orders', (req, res) => {
  const db = readDb();
  res.json(db.orders || []);
});

app.post('/api/orders', (req, res) => {
  const db = readDb();
  const order = req.body;
  db.orders = db.orders || [];

  const idx = db.orders.findIndex(o => o.id === order.id);
  if (idx >= 0) {
    db.orders[idx] = order;
  } else {
    db.orders.unshift(order);
  }

  writeDb(db);
  res.json({ success: true, order });
});

// Measurements
app.post('/api/measurements', (req, res) => {
  const db = readDb();
  const { customerId, data } = req.body;
  db.measurements = db.measurements || {};
  db.measurements[customerId] = data;

  writeDb(db);
  res.json({ success: true, measurements: data });
});

// Transactions
app.post('/api/transactions', (req, res) => {
  const db = readDb();
  const txn = req.body;
  db.transactions = db.transactions || [];
  db.transactions.unshift(txn);

  writeDb(db);
  res.json({ success: true, transaction: txn });
});

// Stock
app.post('/api/stock', (req, res) => {
  const db = readDb();
  const item = req.body;
  db.stock = db.stock || [];
  const idx = db.stock.findIndex(s => s.id === item.id);
  if (idx >= 0) {
    db.stock[idx] = item;
  } else {
    db.stock.unshift(item);
  }

  writeDb(db);
  res.json({ success: true, item });
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`   HINGU TAILORS ERP - SERVER RUNNING ON PORT ${PORT}`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`====================================================`);
});
