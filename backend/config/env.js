const dotenv = require('dotenv');

dotenv.config();

/**
 * Validates required environment variables at server startup.
 * Immediately terminates with clear error message if any critical configuration is missing.
 */
const validateEnv = () => {
  const requiredVars = [
    'PORT',
    'MONGODB_URI',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'CLOUDINARY_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
    'CLIENT_URL'
  ];

  const missing = [];
  for (const v of requiredVars) {
    if (!process.env[v] || process.env[v].trim() === '') {
      missing.push(v);
    }
  }

  if (missing.length > 0) {
    console.error('❌ CRITICAL STARTUP ERROR: Missing required environment variables:');
    missing.forEach(v => console.error(`   - ${v}`));
    console.error('👉 Please configure these variables in your .env file before starting the application.');
    process.exit(1);
  }

  console.log('✅ All required environment variables validated successfully.');
};

module.exports = {
  validateEnv
};
