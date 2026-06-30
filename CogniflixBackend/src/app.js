import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import authRoutes from './routes/authRoutes.js';
import interactionRoutes from './routes/interactionRoutes.js';
import movieRoutes from './routes/movieRoutes.js';
import webSeriesRoutes from './routes/webSeriesRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import recommendationRoutes from './routes/recommendation.routes.js';
import searchRoutes from './routes/search.routes.js';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';

const app = express();

app.use(express.json());
app.use(cookieParser());

const allowedOrigins = [
  "https://cogniflix.vercel.app",
  "https://main.d3pelnl55s3qgs.amplifyapp.com",
  "http://localhost:3000",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin) || origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
        return callback(null, true);
      }

      return callback(new Error("CORS not allowed"), false);
    },
    credentials: true,
  })
);

// Mount route handlers with unified API prefix
app.use("/api/auth", authRoutes);
app.use("/api/interactions", interactionRoutes);
app.use("/api/movies", movieRoutes);
app.use("/api/webseries", webSeriesRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/search", searchRoutes);

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/test", (req, res) => {
  res.send("Server working");
});

app.get("/", (req, res) => {
  res.status(200).json({
    status: "online",
    message: "Cogniflix API is running",
    endpoints: [
      "/api/auth",
      "/api/interactions",
      "/api/movies",
      "/api/webseries",
      "/api/recommendations",
      "/api/search",
      "/api/health"
    ]
  });
});

app.use(notFound);
app.use(errorHandler);

export default app;
