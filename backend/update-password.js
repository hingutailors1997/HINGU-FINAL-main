const mongoose = require('mongoose');
const { User } = require('./models/Auth');
require('dotenv').config();

async function updatePassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const user = await User.findOne({ email: 'admin@hingutailors.com' });
    if (user) {
      user.password = 'Hingutailor@1997'; 
      await user.save();
      console.log('Password updated successfully for admin@hingutailors.com');
    } else {
      console.log('User admin@hingutailors.com not found.');
    }
    
    // Also check test user
    const testUser = await User.findOne({ email: 'test@hingutailors.com' });
    if (testUser) {
      testUser.password = '456';
      await testUser.save();
      console.log('Password updated successfully for test@hingutailors.com');
    }
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.connection.close();
  }
}
updatePassword();
