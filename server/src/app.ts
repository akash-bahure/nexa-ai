import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";
import { rateLimit } from "express-rate-limit";
import swaggerUi from "swagger-ui-express";

import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { swaggerSpec } from "./docs/swagger.js";

import apiRoutes from "./routes/index.js";
import { notFoundHandler } from "./middleware/not-found.middleware.js";
import { errorHandler } from "./middleware/error.middleware.js";

const app = express();

// Security headers
app.use(helmet());

// Frontend access
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);

// Request logging
app.use(pinoHttp({ logger }));

// Request body and cookie parsing
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

app.use("/api", apiLimiter);

// API routes
app.use("/api/v1", apiRoutes);

// Swagger documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 404 handling
app.use(notFoundHandler);

// Centralized error handling
app.use(errorHandler);

export default app;
