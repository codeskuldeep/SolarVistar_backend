import { v2 as cloudinary } from "cloudinary";

// 1. Define required credentials
const requiredConfig = [
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

// 2. Fail-fast validation: Ensure all keys exist before app starts
requiredConfig.forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ FATAL ERROR: Missing Cloudinary config - ${key} is not defined in .env`);
    process.exit(1); // Halt the Node.js process immediately
  }
});

// 3. Initialize Cloudinary SDK
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // Enforce HTTPS for all generated URLs
});

// Export the configured instance, not the raw library
export default cloudinary;