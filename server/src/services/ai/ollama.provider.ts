import { env } from "../../config/env.js";
import { AppError } from "../../middleware/error.middleware.js";

import type {
  AIMessage,
  AIModel,
  AIProvider,
} from "./ai-provider.interface.js";

interface OllamaChatResponse {
  message?: {
    content?: string;
  };
}

interface OllamaStreamChunk {
  message?: {
    content?: string;
  };
  done?: boolean;
  error?: string;
}

interface OllamaTagsResponse {
  models?: {
    name: string;
    size: number;
    modified_at: string;
  }[];
}

export class OllamaProvider implements AIProvider {
  // Fetch installed Ollama models.
  async listModels(): Promise<AIModel[]> {
    let response: Response;

    try {
      response = await fetch(`${env.OLLAMA_BASE_URL}/api/tags`, {
        method: "GET",
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      throw new AppError(
        503,
        "Unable to connect to Ollama. Make sure Ollama is running."
      );
    }

    if (!response.ok) {
      throw new AppError(
        502,
        `Unable to retrieve Ollama models: ${response.status}`
      );
    }

    const data = (await response.json()) as OllamaTagsResponse;

    return (data.models ?? []).map((model) => ({
      name: model.name,
      size: model.size,
      modifiedAt: model.modified_at,
    }));
  }

  // Non-streaming chat.
  async chat(
    messages: AIMessage[],
    model: string = env.OLLAMA_MODEL
  ): Promise<string> {
    let response: Response;

    try {
      response = await fetch(`${env.OLLAMA_BASE_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          stream: false,
        }),
        signal: AbortSignal.timeout(120000),
      });
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new AppError(504, "AI model request timed out");
      }

      throw new AppError(
        503,
        "Unable to connect to Ollama. Make sure Ollama is running."
      );
    }

    if (!response.ok) {
      throw new AppError(
        502,
        `Ollama request failed with status ${response.status}`
      );
    }

    const data = (await response.json()) as OllamaChatResponse;
    const content = data.message?.content;

    if (!content) {
      throw new AppError(502, "AI returned an empty response");
    }

    return content;
  }

  // Streaming chat.
  async *chatStream(
    messages: AIMessage[],
    model: string = env.OLLAMA_MODEL
  ): AsyncGenerator<string> {
    let response: Response;

    try {
      response = await fetch(`${env.OLLAMA_BASE_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
        }),
        signal: AbortSignal.timeout(120000),
      });
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new AppError(504, "AI model request timed out");
      }

      throw new AppError(
        503,
        "Unable to connect to Ollama. Make sure Ollama is running."
      );
    }

    if (!response.ok) {
      throw new AppError(
        502,
        `Ollama request failed with status ${response.status}`
      );
    }

    if (!response.body) {
      throw new AppError(502, "Ollama returned an empty stream");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();

        buffer += decoder.decode(value, {
          stream: !done,
        });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmedLine = line.trim();

          if (!trimmedLine) continue;

          const chunk = JSON.parse(trimmedLine) as OllamaStreamChunk;

          if (chunk.error) {
            throw new AppError(502, chunk.error);
          }

          const content = chunk.message?.content;

          if (content) {
            yield content;
          }
        }

        if (done) break;
      }

      if (buffer.trim()) {
        const chunk = JSON.parse(buffer) as OllamaStreamChunk;

        if (chunk.error) {
          throw new AppError(502, chunk.error);
        }

        if (chunk.message?.content) {
          yield chunk.message.content;
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
