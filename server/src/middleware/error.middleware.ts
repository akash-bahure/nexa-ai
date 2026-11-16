import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { logger } from "../lib/logger.js";
import { env } from "../config/env.js";

export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = "AppError";
  }
}

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  const statusCode = error instanceof AppError ? error.statusCode : 500;

  const message =
    error instanceof AppError ? error.message : "Internal server error";

  logger.error(
    {
      err: error,
      method: req.method,
      path: req.originalUrl,
    },
    "Request failed"
  );

  res.status(statusCode).json({
    success: false,
    message,
    ...(env.NODE_ENV === "development" && {
      stack: error instanceof Error ? error.stack : undefined,
    }),
  });
};
