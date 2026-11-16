import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_URL: z.string().url().default("http://localhost:5173"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),

  OLLAMA_BASE_URL: z.string().url().default("http://127.0.0.1:11434"),
  OLLAMA_MODEL: z.string().min(1).default("qwen2.5:0.5b-instruct"),
  OLLAMA_EMBEDDING_MODEL: z.string().min(1).default("nomic-embed-text"),
  UPLOAD_MAX_FILE_SIZE_MB: z.coerce.number().positive().default(20),
  UPLOAD_DIR: z.string().default("uploads"),

  JWT_ACCESS_SECRET: z
    .string()
    .min(10)
    .default("nexa_ai_access_token_super_secret_key_2026_secure"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(10)
    .default("nexa_ai_refresh_token_super_secret_key_2026_secure"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error("Invalid environment configuration:", result.error.flatten());
  process.exit(1);
}

export const env = result.data;
