/*
FILE: app.js

PURPOSE:
Configures the Express application, middleware, and route mounting.

FLOW:
Server Start -> Middleware -> Routes

USED BY:
server.js

NEXT FLOW:
Routes (authRoutes.js, movieRoutes.js, etc.)

*/
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

const app = express();

app.use(express.json());
app.use(cookieParser());

const allowedOrigins = [
  "https://main.d2ccpg74a1qwou.amplifyapp.com",
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

// ✅ unified API structure
app.use("/api/auth", authRoutes);
app.use("/api/interactions", interactionRoutes);
app.use("/api/movies", movieRoutes);
app.use("/api/webseries", webSeriesRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/search", searchRoutes);

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
      "/api/recommendations"
    ]
  });
});

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({ error: "Internal Server Error" });
});

export default app;