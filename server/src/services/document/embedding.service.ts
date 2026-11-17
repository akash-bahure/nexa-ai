import { GoogleGenAI } from "@google/genai";
import { env } from "../../config/env.js";
import { AppError } from "../../middleware/error.middleware.js";

const genAI = new GoogleGenAI({
  apiKey: env.GEMINI_API_KEY,
});

const EMBEDDING_DIMENSIONS = 768;

type EmbeddingTask = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

const createEmbedding = async (
  text: string,
  taskType: EmbeddingTask
): Promise<number[]> => {
  if (!text.trim()) {
    throw new AppError(400, "Cannot generate embedding for empty text");
  }

  try {
    const response = await genAI.models.embedContent({
      model: env.GEMINI_EMBEDDING_MODEL,
      contents: text,
      config: {
        taskType,
        outputDimensionality: EMBEDDING_DIMENSIONS,
      },
    });

    const embedding = response.embeddings?.[0]?.values;

    if (!embedding || embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new AppError(
        502,
        `Gemini returned an invalid embedding dimension. Expected ${EMBEDDING_DIMENSIONS}.`
      );
    }

    return embedding;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (error instanceof Error && error.name === "TimeoutError") {
      throw new AppError(504, "Gemini embedding request timed out");
    }

    throw new AppError(
      502,
      "Gemini embedding generation failed. Check API configuration and quota."
    );
  }
};

// Used for user questions during retrieval.
export const generateEmbedding = async (text: string): Promise<number[]> => {
  return createEmbedding(text, "RETRIEVAL_QUERY");
};

// Used for uploaded document chunks.
export const generateEmbeddings = async (
  texts: string[]
): Promise<number[][]> => {
  const results: number[][] = [];

  for (const text of texts) {
    results.push(await createEmbedding(text, "RETRIEVAL_DOCUMENT"));
  }

  return results;
};
