const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const path = require('path');

// Configure Cloudinary (requires environment variables)
// CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'demo',
  api_key: process.env.CLOUDINARY_API_KEY || '123456789012345',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'secret'
});

// Setup multer storage (Local fallback if Cloudinary is dummy)
let storage;
if (process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_KEY !== '123456789012345') {
  storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'hingu_tailors',
      allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
      public_id: (req, file) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        return file.fieldname + '-' + uniqueSuffix;
      },
    },
  });
} else {
  // Use local disk storage
  const fs = require('fs');
  const uploadDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  });
}

const upload = multer({ storage: storage });

module.exports = {
  upload,
  cloudinary
};
