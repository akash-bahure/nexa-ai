import { env } from "../../config/env.js";
import { AppError } from "../../middleware/error.middleware.js";

import type {
  AIMessage,
  AIModel,
  AIProvider,
} from "./ai-provider.interface.js";

interface GroqResponse {
  choices?: {
    message?: {
      content?: string | null;
    };
  }[];
  error?: {
    message?: string;
  };
}

interface GroqStreamChunk {
  choices?: {
    delta?: {
      content?: string | null;
    };
  }[];
  error?: {
    message?: string;
  };
}

interface GroqModelsResponse {
  data?: {
    id: string;
    created?: number;
  }[];
}

const GROQ_API_URL = "https://api.groq.com/openai/v1";

export class GroqProvider implements AIProvider {
  private getHeaders(): HeadersInit {
    if (!env.GROQ_API_KEY) {
      throw new AppError(503, "Groq API key is not configured");
    }

    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
    };
  }

  private async handleError(response: Response): Promise<AppError> {
    const body = await response.text().catch(() => "");

    let message = `Groq API request failed: ${response.status}`;

    try {
      const data = JSON.parse(body) as GroqResponse;

      if (data.error?.message) {
        message = data.error.message;
      }
    } catch {
      // Keep the default error message.
    }

    return new AppError(502, message);
  }

  // Return the configured Groq model.
  async listModels(): Promise<AIModel[]> {
    return [
      {
        name: env.GROQ_MODEL,
        size: 0,
        modifiedAt: "",
      },
    ];
  }

  // Non-streaming chat.
  async chat(
    messages: AIMessage[],
    model: string = env.GROQ_MODEL
  ): Promise<string> {
    let response: Response;

    try {
      response = await fetch(`${GROQ_API_URL}/chat/completions`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          model,
          messages,
          stream: false,
        }),
        signal: AbortSignal.timeout(120000),
      });
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new AppError(504, "Groq AI request timed out");
      }

      if (error instanceof AppError) throw error;

      throw new AppError(503, "Unable to connect to Groq AI");
    }

    if (!response.ok) {
      throw await this.handleError(response);
    }

    const data = (await response.json()) as GroqResponse;

    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new AppError(502, "Groq returned an empty response");
    }

    return content;
  }

  // Streaming chat using Server-Sent Events.
  async *chatStream(
    messages: AIMessage[],
    model: string = env.GROQ_MODEL
  ): AsyncGenerator<string> {
    let response: Response;

    try {
      response = await fetch(`${GROQ_API_URL}/chat/completions`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          model,
          messages,
          stream: true,
        }),
        signal: AbortSignal.timeout(120000),
      });
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new AppError(504, "Groq streaming request timed out");
      }

      if (error instanceof AppError) throw error;

      throw new AppError(503, "Unable to connect to Groq AI");
    }

    if (!response.ok) {
      throw await this.handleError(response);
    }

    if (!response.body) {
      throw new AppError(502, "Groq returned an empty stream");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = "";

    const processLine = (line: string): string | null => {
      const trimmed = line.trim();

      if (!trimmed.startsWith("data:")) return null;

      const payload = trimmed.slice(5).trim();

      if (!payload || payload === "[DONE]") return null;

      const chunk = JSON.parse(payload) as GroqStreamChunk;

      if (chunk.error?.message) {
        throw new AppError(502, chunk.error.message);
      }

      return chunk.choices?.[0]?.delta?.content ?? null;
    };

    try {
      while (true) {
        const { done, value } = await reader.read();

        buffer += decoder.decode(value, { stream: !done });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const content = processLine(line);

          if (content) {
            yield content;
          }
        }

        if (done) break;
      }

      if (buffer.trim()) {
        const content = processLine(buffer);

        if (content) {
          yield content;
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
