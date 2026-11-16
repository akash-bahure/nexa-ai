
import app from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { disconnectPrisma } from "./config/prisma.js";

const server = app.listen(env.PORT, () => {
  logger.info(
    {
      port: env.PORT,
      environment: env.NODE_ENV,
    },
    "Nexa AI API server started"
  );

  logger.info(`API: http://localhost:${env.PORT}/api/v1`);
  logger.info(`Swagger: http://localhost:${env.PORT}/api-docs`);
});

let shuttingDown = false;

const shutdown = (signal: string) => {
  if (shuttingDown) return;

  shuttingDown = true;

  logger.info({ signal }, "Shutting down server");

  server.close(async (error) => {
    try {
      await disconnectPrisma();

      if (error) {
        logger.error({ err: error }, "Server shutdown failed");
        process.exit(1);
      }

      logger.info("Server and database connections closed successfully");
      process.exit(0);
    } catch (shutdownError) {
      logger.error(
        { err: shutdownError },
        "Database shutdown failed"
      );

      process.exit(1);
    }
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));