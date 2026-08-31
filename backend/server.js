import "dotenv/config"; // P1: Load env vars first before any evaluation
import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import resumeRoutes from "./routes/resumeRoutes.js";
import resumeBuilderRoutes from "./routes/resumeBuilderRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { MODEL } from "./services/geminiService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

// Connect to MongoDB
connectDB();

// 5. CORS — Must be before express.json() and routes. (P6: Never use app.options("*", cors()))
app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-user-uid", "x-user-email"],
    credentials: true
  })
);

app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Health endpoint
app.get("/api/health", (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? "connected" : dbState === 2 ? "connecting" : "disconnected";

  res.status(200).json({
    status: "ok",
    db: dbStatus,
    model: MODEL
  });
});

// API Routes
app.use("/api/resume", resumeRoutes);
app.use("/api/resumes", resumeBuilderRoutes);

// Error Handling Middleware
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`🤖 AI Engine configured with model: ${MODEL}`);
});
