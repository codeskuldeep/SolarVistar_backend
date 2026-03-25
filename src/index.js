// src/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// 1. Import Routes
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import leadRoutes from './routes/leadRoutes.js';
import visitRoutes from './routes/visitRoutes.js';


// 2. Import your new Error Middleware
import { errorMiddleware } from './middlewares/errorMiddleware.js';

dotenv.config();

const app = express();

// Standard Middleware
app.use(cors());
app.use(express.json());

// 3. Mount your Routes
// Add this to your imports at the top

// Add this with your other app.use() route statements
app.use('/api/leads', leadRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);


app.use('/api/visits', visitRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Solar Vistar CRM API is running' });
});

// 🚨 4. THE GLOBAL ERROR HANDLER MUST GO HERE 🚨
// It sits at the very bottom to catch any errors thrown by the routes above it.
app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});