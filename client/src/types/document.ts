export interface Document {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  pageCount?: number | null;
  status: "processing" | "ready" | "completed" | "error";
  errorMessage?: string | null;
  createdAt: string;
  updatedAt?: string;
  _count?: { chunks: number };
}

export interface RAGSource {
  documentId: string;
  originalName: string;
  pageNumber: number | null;
  excerpt: string;
}

export interface RAGResult {
  answer: string;
  sources: RAGSource[];
}

export interface RAGStreamEvent {
  type: "sources" | "token" | "done" | "error";
  sources?: RAGSource[];
  content?: string;
  message?: string;
}
