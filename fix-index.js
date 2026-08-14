const mongoose = require('mongoose');

async function fixIndex() {
  try {
    // Explicitly connect to the correct database: hingu_erp
    const dbUrl = 'mongodb://127.0.0.1:27017/hingu_erp';
    await mongoose.connect(dbUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log(`Connected to MongoDB at ${dbUrl}`);
    console.log('Dropping old non-sparse customerId index...');
    
    // We bypass Mongoose models to directly drop the index from the DB
    try {
      await mongoose.connection.collection('customers').dropIndex('customerId_1');
      console.log('✅ Successfully dropped old customerId index.');
    } catch (err) {
      console.log('⚠️ Index might not exist or already dropped:', err.message);
    }

    // Now let's enforce sparse property explicitly
    console.log('Rebuilding sparse index...');
    await mongoose.connection.collection('customers').createIndex(
      { customerId: 1 }, 
      { unique: true, sparse: true, background: true }
    );
    console.log('✅ Sparse index successfully created!');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

fixIndex();
