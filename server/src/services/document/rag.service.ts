import { searchDocumentChunks } from "./document.service.js";
import { env } from "../../config/env.js";
import { AppError } from "../../middleware/error.middleware.js";
import type { AIMessage } from "../ai/ai-provider.interface.js";
import { OllamaProvider } from "../ai/ollama.provider.js";

const aiProvider = new OllamaProvider();

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

const buildRAGPrompt = (
  query: string,
  chunks: Array<{ content: string; pageNumber: number | null; originalName: string; documentId: string }>
): AIMessage[] => {
  const contextParts = chunks.map((chunk, i) => {
    const pageRef = chunk.pageNumber ? ` (page ${chunk.pageNumber})` : "";
    return `[Source ${i + 1}: ${chunk.originalName}${pageRef}]\n${chunk.content}`;
  });

  const context = contextParts.join("\n\n---\n\n");

  return [
    {
      role: "system",
      content: `You are Nexa AI, a helpful document assistant. Answer the user's question based ONLY on the provided document context below. If the answer is not found in the documents, say so clearly. Always cite which document and page number (if available) your answer comes from, using [Source N] references.

DOCUMENT CONTEXT:
${context}`,
    },
    {
      role: "user",
      content: query,
    },
  ];
};

export const answerWithRAG = async (
  query: string,
  documentIds: string[],
  userId: string,
  model?: string
): Promise<RAGResult> => {
  if (documentIds.length === 0) {
    throw new AppError(400, "No documents selected for RAG query");
  }

  const relevantChunks = await searchDocumentChunks(query, documentIds, userId, 5);

  if (relevantChunks.length === 0) {
    return {
      answer: "I could not find any relevant information in the selected documents to answer your question.",
      sources: [],
    };
  }

  const messages = buildRAGPrompt(query, relevantChunks);
  const answer = await aiProvider.chat(messages, model || env.OLLAMA_MODEL);

  const sources: RAGSource[] = relevantChunks
    .filter((c) => c.similarity > 0.3)
    .slice(0, 3)
    .map((c) => ({
      documentId: c.documentId,
      originalName: c.originalName,
      pageNumber: c.pageNumber,
      excerpt: c.content.slice(0, 200) + (c.content.length > 200 ? "..." : ""),
    }));

  return { answer, sources };
};

export const answerWithRAGStream = async function* (
  query: string,
  documentIds: string[],
  userId: string,
  model?: string
): AsyncGenerator<string> {
  if (documentIds.length === 0) {
    throw new AppError(400, "No documents selected for RAG query");
  }

  const relevantChunks = await searchDocumentChunks(query, documentIds, userId, 5);

  if (relevantChunks.length === 0) {
    yield "I could not find any relevant information in the selected documents to answer your question.";
    return;
  }

  const messages = buildRAGPrompt(query, relevantChunks);
  const stream = aiProvider.chatStream(messages, model || env.OLLAMA_MODEL);

  for await (const token of stream) {
    yield token;
  }
};

export const getRAGSources = async (
  query: string,
  documentIds: string[],
  userId: string
): Promise<RAGSource[]> => {
  const relevantChunks = await searchDocumentChunks(query, documentIds, userId, 3);
  return relevantChunks
    .filter((c) => c.similarity > 0.3)
    .map((c) => ({
      documentId: c.documentId,
      originalName: c.originalName,
      pageNumber: c.pageNumber,
      excerpt: c.content.slice(0, 200) + (c.content.length > 200 ? "..." : ""),
    }));
};
