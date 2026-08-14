const mongoose = require('mongoose');
const { FabricInventory, ScanHistory, StockHistory } = require('./models/Inventory');
require('dotenv').config();

async function runTest() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hingu-tailors');
    console.log('Connected.');

    // 1. Generate Fabric
    console.log('\n--- 1. Generating Fabric ---');
    const fabricId = 'FAB-TEST-' + Math.floor(Math.random() * 10000);
    const newFabric = new FabricInventory({
      fabricId: fabricId,
      name: 'Test Cotton Blend',
      category: 'Shirting',
      totalAvailable: 100,
      minimumStock: 10,
      purchasePricePerMeter: 120,
      sellingPricePerMeter: 200,
      status: 'In Stock'
    });
    
    await newFabric.save();
    console.log(`✅ Fabric created successfully with Barcode: ${fabricId}`);

    // 2. Scan Barcode (Simulating the /api/stock/scan endpoint logic)
    console.log('\n--- 2. Scanning Barcode ---');
    const scannedFabric = await FabricInventory.findOne({ fabricId: fabricId });
    if (!scannedFabric) throw new Error('Fabric not found during scan');
    
    const log = new ScanHistory({
      barcode: fabricId,
      device: 'Automated Test Suite',
      browser: 'Node.js',
      ipAddress: '127.0.0.1',
      result: 'Success'
    });
    await log.save();
    console.log(`✅ Barcode scanned and verified. Name: ${scannedFabric.name}`);
    console.log(`✅ Scan History logged to MongoDB.`);

    // 3. Deduct Stock
    console.log('\n--- 3. Deducting Stock ---');
    const metersToUse = 5.5;
    const qtyBefore = scannedFabric.totalAvailable;
    
    scannedFabric.totalAvailable -= metersToUse;
    scannedFabric.usedStock += metersToUse;
    await scannedFabric.save();

    const history = new StockHistory({
      fabricId: scannedFabric._id,
      barcode: scannedFabric.fabricId,
      fabricName: scannedFabric.name,
      qtyBefore: qtyBefore,
      qtyChange: -metersToUse,
      qtyRemaining: scannedFabric.totalAvailable,
      reason: 'Used for Test Order',
      orderNumber: 'ORD-TEST',
      deviceUsed: 'Node.js Script'
    });
    await history.save();
    
    console.log(`✅ Stock deducted. Previous: ${qtyBefore}m -> New: ${scannedFabric.totalAvailable}m (Deducted ${metersToUse}m)`);
    console.log(`✅ Stock History logged to MongoDB.`);

    console.log('\n--- Test Completed Successfully! ---');

  } catch (error) {
    console.error('❌ Test Failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

runTest();
