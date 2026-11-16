import type { RequestHandler } from "express";
import { z } from "zod";
import { AppError } from "../middleware/error.middleware.js";

import {
  createConversation,
  getAllConversations,
  getConversationById,
  updateConversationTitle,
  deleteConversation,
} from "../services/conversation.service.js";

const idSchema = z.string().uuid();

const createSchema = z.object({
  title: z.string().trim().min(1).max(100).optional(),
});

const updateSchema = z.object({
  title: z.string().trim().min(1).max(100),
});

const listQuerySchema = z.object({
  query: z.string().trim().optional(),
  q: z.string().trim().optional(),
});

export const createConversationHandler: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    if (!req.user?.id) {
      throw new AppError(401, "Unauthorized");
    }

    const { title } = createSchema.parse(req.body);

    const conversation = await createConversation(req.user.id, title);

    res.status(201).json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    next(error);
  }
};

export const listConversations: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      throw new AppError(401, "Unauthorized");
    }

    const { query, q } = listQuerySchema.parse(req.query);
    const searchQuery = query || q;

    const conversations = await getAllConversations(req.user.id, searchQuery);

    res.status(200).json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    next(error);
  }
};

export const getConversation: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      throw new AppError(401, "Unauthorized");
    }

    const id = idSchema.parse(req.params.id);

    const conversation = await getConversationById(id, req.user.id);

    if (!conversation) {
      res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    next(error);
  }
};

export const renameConversation: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      throw new AppError(401, "Unauthorized");
    }

    const id = idSchema.parse(req.params.id);
    const { title } = updateSchema.parse(req.body);

    const conversation = await updateConversationTitle(
      id,
      req.user.id,
      title
    );

    if (!conversation) {
      res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    next(error);
  }
};

export const removeConversation: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      throw new AppError(401, "Unauthorized");
    }

    const id = idSchema.parse(req.params.id);

    const deleted = await deleteConversation(id, req.user.id);

    if (!deleted) {
      res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Conversation deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
