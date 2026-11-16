import type {
  AIModelsResponse,
  APIMessage,
  APIResponse,
  APIConversationResponse,
  ConversationMessageResponse,
  StreamEvent,
} from "../types/chat";
import { useAuthStore } from "../stores/authStore";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1";

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = useAuthStore.getState().token;

  const authHeaders: Record<string, string> = {};
  if (token) {
    authHeaders["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...options.headers,
    },
  });

  if (response.status === 401) {
    void useAuthStore.getState().logout();
  }

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      result?.message || "Something went wrong. Please try again."
    );
  }

  return result as T;
}

// Fetch installed Ollama models.
export async function getModels(): Promise<AIModelsResponse> {
  const result = await request<APIResponse<AIModelsResponse>>("/chat/models");

  return result.data;
}

// Create conversation
export async function createConversation(title?: string) {
  const result = await request<APIResponse<APIConversationResponse>>(
    "/conversations",
    {
      method: "POST",
      body: JSON.stringify(title ? { title } : {}),
    }
  );

  return result.data;
}

// Get all conversations (with optional search query)
export async function getConversations(query?: string) {
  const endpoint = query?.trim()
    ? `/conversations?query=${encodeURIComponent(query.trim())}`
    : "/conversations";

  const result = await request<APIResponse<APIConversationResponse[]>>(endpoint);

  return result.data;
}

// Get conversation with messages
export async function getConversation(id: string) {
  const result = await request<APIResponse<APIConversationResponse>>(
    `/conversations/${id}`
  );

  return result.data;
}

// Rename conversation
export async function renameConversation(id: string, title: string) {
  const result = await request<APIResponse<APIConversationResponse>>(
    `/conversations/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify({ title }),
    }
  );

  return result.data;
}

// Delete conversation
export async function deleteConversation(id: string) {
  return request<{
    success: boolean;
    message: string;
  }>(`/conversations/${id}`, {
    method: "DELETE",
  });
}

// Convert backend conversation to frontend format
export function mapConversation(data: APIConversationResponse) {
  return {
    id: data.id,
    title: data.title,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
    messageCount: data._count?.messages ?? data.messages?.length ?? 0,
  };
}

// Convert backend messages to frontend format
export function mapMessages(data: ConversationMessageResponse[]) {
  return data.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: new Date(message.createdAt),
  }));
}

// SSE streaming
export async function sendChatMessage(
  conversationId: string,
  messages: APIMessage[],
  model: string,
  onChunk: (content: string) => void,
  onConversation?: (id: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const token = useAuthStore.getState().token;

  const authHeaders: Record<string, string> = {};
  if (token) {
    authHeaders["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/chat/stream`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...authHeaders,
    },
    body: JSON.stringify({
      conversationId,
      messages,
      model,
    }),
    signal,
  });

  if (response.status === 401) {
    void useAuthStore.getState().logout();
  }

  if (!response.ok) {
    const result = await response.json().catch(() => null);

    throw new Error(result?.message || "Unable to generate AI response.");
  }

  if (!response.body) {
    throw new Error("Streaming response is not available.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let buffer = "";
  let completed = false;

  const processEvent = (event: string) => {
    const data = event
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");

    if (!data) return;

    let result: StreamEvent;

    try {
      result = JSON.parse(data);
    } catch {
      throw new Error("Invalid streaming response received.");
    }

    switch (result.type) {
      case "conversation":
        if (result.conversationId) {
          onConversation?.(result.conversationId);
        }
        break;

      case "token":
        if (result.content) {
          onChunk(result.content);
        }
        break;

      case "done":
        completed = true;
        break;

      case "error":
        throw new Error(result.message || "AI streaming failed.");

      default:
        break;
    }
  };

  try {
    while (!completed) {
      const { done, value } = await reader.read();

      if (value) {
        buffer += decoder.decode(value, { stream: !done });
      } else if (done) {
        buffer += decoder.decode();
      }

      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() ?? "";

      for (const event of events) {
        processEvent(event);
      }

      if (done) break;
    }

    if (buffer.trim()) {
      processEvent(buffer);
    }

    if (!completed) {
      throw new Error("AI streaming ended unexpectedly.");
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
