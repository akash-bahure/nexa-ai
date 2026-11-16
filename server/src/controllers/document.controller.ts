import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import { AppError } from "../middleware/error.middleware.js";
import { ragQuerySchema } from "../validators/document.validator.js";
import {
  processDocument,
  getUserDocuments,
  getDocumentById,
  deleteDocument,
} from "../services/document/document.service.js";
import { answerWithRAG, answerWithRAGStream, getRAGSources } from "../services/document/rag.service.js";
import { prisma } from "../config/prisma.js";

// POST /api/v1/documents/upload
export const uploadDocument: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user?.id) throw new AppError(401, "Unauthorized");
    if (!req.file) throw new AppError(400, "No file uploaded");

    const allowedMimes = [
      "application/pdf",
      "text/plain",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedMimes.includes(req.file.mimetype)) {
      throw new AppError(400, "Unsupported file type. Upload PDF, TXT, or DOCX.");
    }

    const maxBytes = env.UPLOAD_MAX_FILE_SIZE_MB * 1024 * 1024;
    if (req.file.size > maxBytes) {
      throw new AppError(400, `File too large. Maximum size is ${env.UPLOAD_MAX_FILE_SIZE_MB}MB.`);
    }

    const doc = await prisma.document.create({
      data: {
        userId: req.user.id,
        filename: req.file.path,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        status: "processing",
      },
    });

    // Process asynchronously (don't await)
    void processDocument(doc.id).catch(() => {});

    res.status(201).json({
      success: true,
      data: {
        id: doc.id,
        originalName: doc.originalName,
        mimeType: doc.mimeType,
        size: doc.size,
        status: doc.status,
        createdAt: doc.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/documents
export const listDocuments: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user?.id) throw new AppError(401, "Unauthorized");
    const docs = await getUserDocuments(req.user.id);
    res.status(200).json({ success: true, data: docs });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/documents/:id
export const getDocument: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user?.id) throw new AppError(401, "Unauthorized");
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const doc = await getDocumentById(id, req.user.id);
    if (!doc) throw new AppError(404, "Document not found");
    res.status(200).json({ success: true, data: doc });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/v1/documents/:id
export const removeDocument: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user?.id) throw new AppError(401, "Unauthorized");
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const deleted = await deleteDocument(id, req.user.id);
    if (!deleted) throw new AppError(404, "Document not found");
    res.status(200).json({ success: true, message: "Document deleted" });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/documents/query  (non-streaming RAG)
export const queryDocuments: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user?.id) throw new AppError(401, "Unauthorized");

    const input = ragQuerySchema.parse(req.body);
    const result = await answerWithRAG(input.query, input.documentIds, req.user.id, input.model);

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/documents/query/stream  (streaming RAG)
export const queryDocumentsStream: RequestHandler = async (req, res, next) => {
  let stream: AsyncGenerator<string> | undefined;
  let clientDisconnected = false;

  try {
    if (!req.user?.id) throw new AppError(401, "Unauthorized");

    const input = ragQuerySchema.parse(req.body);

    // Get sources first (fast)
    const sources = await getRAGSources(input.query, input.documentIds, req.user.id);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    res.on("close", () => {
      if (!res.writableEnded) {
        clientDisconnected = true;
        void stream?.return(undefined);
      }
    });

    // Send sources event first
    res.write(`data: ${JSON.stringify({ type: "sources", sources })}\n\n`);

    stream = answerWithRAGStream(input.query, input.documentIds, req.user.id, input.model);

    for await (const token of stream) {
      if (clientDisconnected || res.destroyed) break;
      res.write(`data: ${JSON.stringify({ type: "token", content: token })}\n\n`);
    }

    if (!clientDisconnected && !res.destroyed) {
      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
      res.end();
    }
  } catch (error) {
    if (clientDisconnected || res.destroyed) return;
    if (!res.headersSent) { next(error); return; }
    const message = error instanceof Error ? error.message : "RAG streaming failed";
    res.write(`data: ${JSON.stringify({ type: "error", message })}\n\n`);
    res.end();
  }
};
