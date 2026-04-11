// src/index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

// 1. Import Routes
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import leadRoutes from "./routes/leadRoutes.js";
import visitRoutes from "./routes/visitRoutes.js";
import quotationRoutes from "./routes/quotationRoutes.js";

// 2. Import your new Error Middleware
import { errorMiddleware } from "./middlewares/errorMiddleware.js";

dotenv.config();
const app = express();

app.use(
  cors({
    origin: "http://localhost:5173", // Must be the exact origin of your Vite frontend (no path!)
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true, // 👈 This is the magic key that allows cookies to pass
  }),
);

app.use(cookieParser());

// Standard Middleware
app.use(express.json());

// 3. Mount your Routes
// Add this to your imports at the top

// Add this with your other app.use() route statements
app.use("/api/leads", leadRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

app.use("/api/visits", visitRoutes);
app.use("/api/quotations", quotationRoutes);

// Health Check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Zorvyn CRM API is running" });
});

// 🚨 4. THE GLOBAL ERROR HANDLER MUST GO HERE 🚨
// It sits at the very bottom to catch any errors thrown by the routes above it.
app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
