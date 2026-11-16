import { env } from "../../config/env.js";
import { AppError } from "../../middleware/error.middleware.js";

interface OllamaEmbedResponse {
  embedding?: number[];
  embeddings?: number[][];
}

export const generateEmbedding = async (text: string): Promise<number[]> => {
  let response: Response;

  try {
    response = await fetch(`${env.OLLAMA_BASE_URL}/api/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: env.OLLAMA_EMBEDDING_MODEL,
        input: text,
      }),
      signal: AbortSignal.timeout(60000),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new AppError(504, "Embedding request timed out");
    }
    throw new AppError(503, "Unable to connect to Ollama for embeddings");
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new AppError(502, `Ollama embedding failed: ${response.status} ${body}`);
  }

  const data = (await response.json()) as OllamaEmbedResponse;

  // Ollama /api/embed returns { embeddings: [[...]] }, older versions { embedding: [...] }
  const embedding = data.embeddings?.[0] ?? data.embedding;

  if (!embedding || embedding.length === 0) {
    throw new AppError(502, "Ollama returned empty embedding");
  }

  return embedding;
};

export const generateEmbeddings = async (texts: string[]): Promise<number[][]> => {
  const results: number[][] = [];
  for (const text of texts) {
    const embedding = await generateEmbedding(text);
    results.push(embedding);
  }
  return results;
};
