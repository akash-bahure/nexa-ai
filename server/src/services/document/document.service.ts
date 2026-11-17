import path from "path";
import fs from "fs/promises";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../middleware/error.middleware.js";
import { extractText } from "./text-extractor.service.js";
import { chunkText } from "./chunker.service.js";
import { generateEmbedding, generateEmbeddings } from "./embedding.service.js";

// Process a newly uploaded document: extract text, chunk, embed, store
export const processDocument = async (documentId: string): Promise<void> => {
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) throw new AppError(404, "Document not found");

  try {
    const { text, pageCount } = await extractText(doc.filename, doc.mimeType);

    if (pageCount !== undefined) {
      await prisma.document.update({
        where: { id: documentId },
        data: { pageCount },
      });
    }

    const chunks = chunkText(text, pageCount);

    if (chunks.length === 0) {
      await prisma.document.update({
        where: { id: documentId },
        data: { status: "completed" },
      });
      return;
    }

    await prisma.documentChunk.deleteMany({
      where: { documentId },
    });

    const embeddings = await generateEmbeddings(chunks.map((c) => c.content));

    // Insert chunks with embeddings using raw SQL (pgvector requires it)
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = embeddings[i];
      const embeddingStr = `[${embedding.join(",")}]`;

      await prisma.$executeRawUnsafe(
        `INSERT INTO "DocumentChunk" (id, "documentId", content, "chunkIndex", "pageNumber", embedding, "createdAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5::vector, NOW())`,
        documentId,
        chunk.content,
        chunk.chunkIndex,
        chunk.pageNumber ?? null,
        embeddingStr
      );
    }

    await prisma.document.update({
      where: { id: documentId },
      data: { status: "completed" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Processing failed";
    await prisma.document
      .update({
        where: { id: documentId },
        data: { status: "error", errorMessage: message },
      })
      .catch(() => {});
    throw error;
  }
};

// Semantic search: find top-k relevant chunks for a query
export const searchDocumentChunks = async (
  query: string,
  documentIds: string[],
  userId: string,
  topK = 5
): Promise<
  Array<{
    content: string;
    chunkIndex: number;
    pageNumber: number | null;
    documentId: string;
    originalName: string;
    similarity: number;
  }>
> => {
  const queryEmbedding = await generateEmbedding(query);
  const embeddingStr = `[${queryEmbedding.join(",")}]`;

  // Build safe placeholder list for document IDs
  const placeholders = documentIds.map((_, i) => `$${i + 3}::uuid`).join(", ");

  const rows = await prisma.$queryRawUnsafe<
    Array<{
      content: string;
      chunk_index: number;
      page_number: number | null;
      document_id: string;
      original_name: string;
      similarity: number;
    }>
  >(
    `SELECT
       dc.content,
       dc."chunkIndex" as chunk_index,
       dc."pageNumber" as page_number,
       dc."documentId" as document_id,
       d."originalName" as original_name,
       1 - (dc.embedding <=> $1::vector) as similarity
     FROM "DocumentChunk" dc
     JOIN "Document" d ON d.id = dc."documentId"
     WHERE dc."documentId" IN (${placeholders})
       AND d."userId" = $2::uuid
       AND dc.embedding IS NOT NULL
     ORDER BY dc.embedding <=> $1::vector
     LIMIT ${topK}`,
    embeddingStr,
    userId,
    ...documentIds
  );

  return rows.map((row) => ({
    content: row.content,
    chunkIndex: row.chunk_index,
    pageNumber: row.page_number,
    documentId: row.document_id,
    originalName: row.original_name,
    similarity: Number(row.similarity),
  }));
};

export const getUserDocuments = async (userId: string) => {
  return prisma.document.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      originalName: true,
      mimeType: true,
      size: true,
      pageCount: true,
      status: true,
      errorMessage: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { chunks: true } },
    },
  });
};

export const getDocumentById = async (id: string, userId: string) => {
  return prisma.document.findFirst({
    where: { id, userId },
    select: {
      id: true,
      originalName: true,
      mimeType: true,
      size: true,
      pageCount: true,
      status: true,
      errorMessage: true,
      createdAt: true,
      _count: { select: { chunks: true } },
    },
  });
};

export const deleteDocument = async (
  id: string,
  userId: string
): Promise<boolean> => {
  // Also delete the actual file
  const doc = await prisma.document.findFirst({
    where: { id, userId },
    select: { filename: true },
  });
  if (!doc) return false;

  const result = await prisma.document.deleteMany({ where: { id, userId } });

  if (result.count > 0) {
    await fs.unlink(doc.filename).catch(() => {}); // ignore if already gone
  }

  return result.count > 0;
};
