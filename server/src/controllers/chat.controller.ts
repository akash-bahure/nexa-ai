import type { RequestHandler } from "express";
import { z } from "zod";

import { env } from "../config/env.js";
import { AppError } from "../middleware/error.middleware.js";

import {
  generateChatResponse,
  generateChatStream,
  getAvailableModels,
} from "../services/chat.service.js";

import {
  createConversation,
  conversationExists,
  saveConversationMessage,
} from "../services/conversation.service.js";

const chatSchema = z.object({
  conversationId: z.string().uuid().optional(),

  model: z.string().trim().min(1).max(120).optional(),

  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(8000),
      })
    )
    .min(1)
    .max(30),
});

type ChatInput = z.infer<typeof chatSchema>;

const prepareConversation = async (userId: string, input: ChatInput) => {
  const latestMessage = input.messages[input.messages.length - 1];

  if (latestMessage.role !== "user") {
    throw new Error("The latest message must be from the user");
  }

  let conversationId = input.conversationId;

  if (conversationId) {
    const existing = await conversationExists(conversationId, userId);

    if (!existing) {
      return null;
    }
  } else {
    const title =
      latestMessage.content.length > 60
        ? `${latestMessage.content.slice(0, 57)}...`
        : latestMessage.content;

    const conversation = await createConversation(userId, title);

    conversationId = conversation.id;
  }

  await saveConversationMessage(conversationId, "user", latestMessage.content);

  return conversationId;
};

// GET /api/v1/chat/models
export const getModels: RequestHandler = async (req, res, next) => {
  try {
    const models = await getAvailableModels();

    res.status(200).json({
      success: true,
      data: {
        models,
        defaultModel: env.OLLAMA_MODEL,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/chat
export const sendChatMessage: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      throw new AppError(401, "Unauthorized");
    }

    const input = chatSchema.parse(req.body);

    const conversationId = await prepareConversation(req.user.id, input);

    if (!conversationId) {
      res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
      return;
    }

    const model = input.model || env.OLLAMA_MODEL;

    const reply = await generateChatResponse(input.messages, model);

    await saveConversationMessage(conversationId, "assistant", reply);

    res.status(200).json({
      success: true,
      data: {
        conversationId,
        role: "assistant",
        content: reply,
        model,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/chat/stream
export const streamChatMessage: RequestHandler = async (req, res, next) => {
  let stream: AsyncGenerator<string> | undefined;
  let clientDisconnected = false;

  try {
    if (!req.user?.id) {
      throw new AppError(401, "Unauthorized");
    }

    const input = chatSchema.parse(req.body);

    const conversationId = await prepareConversation(req.user.id, input);

    if (!conversationId) {
      res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
      return;
    }

    const model = input.model || env.OLLAMA_MODEL;

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

    res.write(
      `data: ${JSON.stringify({
        type: "conversation",
        conversationId,
        model,
      })}\n\n`
    );

    stream = generateChatStream(input.messages, model);

    let assistantContent = "";

    for await (const content of stream) {
      if (clientDisconnected || res.destroyed) {
        break;
      }

      assistantContent += content;

      res.write(
        `data: ${JSON.stringify({
          type: "token",
          content,
        })}\n\n`
      );
    }

    if (clientDisconnected || res.destroyed) {
      return;
    }

    if (assistantContent.trim()) {
      await saveConversationMessage(
        conversationId,
        "assistant",
        assistantContent
      );
    }

    res.write(
      `data: ${JSON.stringify({
        type: "done",
        conversationId,
        model,
      })}\n\n`
    );

    res.end();
  } catch (error) {
    if (clientDisconnected || res.destroyed) {
      return;
    }

    if (!res.headersSent) {
      next(error);
      return;
    }

    const message =
      error instanceof Error ? error.message : "AI streaming failed";

    res.write(
      `data: ${JSON.stringify({
        type: "error",
        message,
      })}\n\n`
    );

    res.end();
  }
};
