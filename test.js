import 'dotenv/config';
import express from 'express';
import { validateUploadHeaders } from './src/middlewares/validateUploadHeaders.js';
import { parseMultipartStream } from './src/utils/streamParser.js';
import { streamUploadToCloudinary, deleteFromCloudinary } from './src/utils/cloudinary.js';

const app = express();

app.use((err, req, res, next) => {
  console.error(`❌ Caught Error: ${err.message}`);
  res.status(err.statusCode || 500).json({ error: err.message });
});

app.post('/test-upload', validateUploadHeaders, async (req, res, next) => {
  try {
    console.log("⏳ 1. Intercepting stream...");
    const { fileStream, info } = await parseMultipartStream(req);
    
    console.log(`⏳ 2. Piping ${info.filename} directly to Cloudinary...`);
    // Pass the live stream directly to our Cloudinary utility
    const result = await streamUploadToCloudinary(fileStream, 'test_invoices', 'user_123');
    
    console.log("✅ 3. UPLOAD SUCCESS! No RAM used.");
    console.log(`🔗 URL: ${result.secure_url}`);
    console.log(`📁 Public ID: ${result.public_id}`);

    console.log("\n⏳ 4. Cleaning up (Deleting test file)...");
    await deleteFromCloudinary(result.public_id);
    console.log("✅ DELETE SUCCESS!");

    res.status(200).json({ message: "Full stream cycle complete!", url: result.secure_url });
  } catch (error) {
    next(error);
  }
});

app.listen(3000, () => {
  console.log("🚀 Server running on port 3000. POST a file to http://localhost:3000/test-upload");
});