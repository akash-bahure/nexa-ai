import type { Document, RAGResult, RAGSource, RAGStreamEvent } from "../types/document";
import type { APIResponse } from "../types/chat";
import { useAuthStore } from "../stores/authStore";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1";

function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function docRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: "include",
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  if (response.status === 401) {
    void useAuthStore.getState().logout();
  }

  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(result?.message || "Request failed");
  }
  return result as T;
}

export async function uploadDocument(
  file: File,
  onProgress?: (pct: number) => void
): Promise<Document> {
  return new Promise((resolve, reject) => {
    const token = useAuthStore.getState().token;
    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE_URL}/documents/upload`);
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.withCredentials = true;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      try {
        const result = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(result.data as Document);
        } else {
          reject(new Error(result?.message || "Upload failed"));
        }
      } catch {
        reject(new Error("Upload failed"));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(formData);
  });
}

export async function getDocuments(): Promise<Document[]> {
  const result = await docRequest<APIResponse<Document[]>>("/documents");
  return result.data;
}

export async function deleteDocument(id: string): Promise<void> {
  await docRequest<{ success: boolean }>(`/documents/${id}`, {
    method: "DELETE",
  });
}

export async function queryDocuments(
  query: string,
  documentIds: string[],
  model?: string
): Promise<RAGResult> {
  const result = await docRequest<APIResponse<RAGResult>>("/documents/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, documentIds, model }),
  });
  return result.data;
}

export async function queryDocumentsStream(
  query: string,
  documentIds: string[],
  model: string,
  onToken: (token: string) => void,
  onSources: (sources: RAGSource[]) => void,
  signal?: AbortSignal
): Promise<void> {
  const token = useAuthStore.getState().token;
  const authHeaders: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {};

  const response = await fetch(`${API_BASE_URL}/documents/query/stream`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...authHeaders,
    },
    body: JSON.stringify({ query, documentIds, model }),
    signal,
  });

  if (response.status === 401) {
    void useAuthStore.getState().logout();
  }

  if (!response.ok) {
    const result = await response.json().catch(() => null);
    throw new Error(result?.message || "RAG streaming failed");
  }

  if (!response.body) throw new Error("No stream body");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let completed = false;

  try {
    while (!completed) {
      const { done, value } = await reader.read();
      if (value) buffer += decoder.decode(value, { stream: !done });
      else if (done) buffer += decoder.decode();

      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() ?? "";

      for (const event of events) {
        const data = event
          .split(/\r?\n/)
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart())
          .join("\n");

        if (!data) continue;

        let parsed: RAGStreamEvent;
        try {
          parsed = JSON.parse(data) as RAGStreamEvent;
        } catch {
          continue;
        }

        if (parsed.type === "sources" && parsed.sources) {
          onSources(parsed.sources);
        } else if (parsed.type === "token" && parsed.content) {
          onToken(parsed.content);
        } else if (parsed.type === "done") {
          completed = true;
          break;
        } else if (parsed.type === "error") {
          throw new Error(parsed.message || "RAG stream error");
        }
      }

      if (done) break;
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getFileIcon(mimeType: string): string {
  if (mimeType === "application/pdf") return "📄";
  if (mimeType === "text/plain") return "📝";
  if (mimeType.includes("word") || mimeType.includes("officedocument")) return "📘";
  return "📎";
}
