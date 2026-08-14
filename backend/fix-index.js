const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load .env from the backend folder where this script is located
dotenv.config({ path: path.join(__dirname, '.env') });

async function fixIndex() {
  try {
    const dbUrl = process.env.MONGODB_URI;
    if (!dbUrl) {
      throw new Error("MONGODB_URI not found in backend/.env!");
    }
    
    console.log(`Connecting to MongoDB Atlas...`);
    await mongoose.connect(dbUrl);
    
    console.log('✅ Connected successfully!');
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
