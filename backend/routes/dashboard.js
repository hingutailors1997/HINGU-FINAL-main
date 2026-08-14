const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    metrics: {
      totalCustomers: 0,
      activeOrders: 0,
      monthlyRevenue: 0,
      lowStockAlerts: 0
    },
    recentActivity: []
  });
});

module.exports = router;
