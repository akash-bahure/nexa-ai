import { Router } from "express";

const router = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Check API health
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: API is healthy
 */

router.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Nexa AI API is running",
    data: {
      service: "nexa-ai-api",
      status: "healthy",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    },
  });
});

export default router;
