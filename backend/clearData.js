const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

async function clearData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    const collections = await mongoose.connection.db.collections();
    for (let collection of collections) {
      if (collection.collectionName !== 'users') { // Keep users
        await collection.deleteMany({});
        console.log('Cleared ' + collection.collectionName);
      }
    }
    console.log('Data cleared successfully.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
clearData();
