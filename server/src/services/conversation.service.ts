import { prisma } from "../config/prisma.js";

export const createConversation = async (userId: string, title?: string) => {
  return prisma.conversation.create({
    data: {
      userId,
      title: title?.trim() || "New Chat",
    },
  });
};

export const getAllConversations = async (userId: string, query?: string) => {
  const trimmed = query?.trim();

  return prisma.conversation.findMany({
    where: {
      userId,
      ...(trimmed
        ? {
            OR: [
              {
                title: {
                  contains: trimmed,
                  mode: "insensitive",
                },
              },
              {
                messages: {
                  some: {
                    content: {
                      contains: trimmed,
                      mode: "insensitive",
                    },
                  },
                },
              },
            ],
          }
        : {}),
    },
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      _count: {
        select: {
          messages: true,
        },
      },
    },
  });
};

export const getConversationById = async (id: string, userId: string) => {
  return prisma.conversation.findFirst({
    where: { id, userId },
    include: {
      messages: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });
};

export const updateConversationTitle = async (
  id: string,
  userId: string,
  title: string
) => {
  const existing = await prisma.conversation.findFirst({
    where: { id, userId },
    select: { id: true },
  });

  if (!existing) {
    return null;
  }

  return prisma.conversation.update({
    where: { id },
    data: { title: title.trim() },
  });
};

export const deleteConversation = async (id: string, userId: string) => {
  const result = await prisma.conversation.deleteMany({
    where: { id, userId },
  });

  return result.count > 0;
};

export const conversationExists = async (id: string, userId: string) => {
  return prisma.conversation.findFirst({
    where: { id, userId },
    select: { id: true },
  });
};

export const saveConversationMessage = async (
  conversationId: string,
  role: "user" | "assistant",
  content: string
) => {
  return prisma.$transaction(async (tx) => {
    const message = await tx.message.create({
      data: {
        conversationId,
        role,
        content,
      },
    });

    await tx.conversation.update({
      where: { id: conversationId },
      data: {
        updatedAt: new Date(),
      },
    });

    return message;
  });
};
