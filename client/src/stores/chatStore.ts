import { create } from "zustand";
import type { ChatMessage, Conversation } from "../types/chat";

interface ChatState {
  messages: ChatMessage[];
  conversations: Conversation[];
  activeConversationId: string | null;

  setMessages: (messages: ChatMessage[]) => void;
  setConversations: (conversations: Conversation[]) => void;
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, content: string) => void;
  removeMessage: (id: string) => void;
  setActiveConversation: (id: string | null) => void;
  startNewChat: () => void;
  upsertConversation: (conversation: Conversation) => void;
  removeConversation: (id: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  conversations: [],
  activeConversationId: null,

  setMessages: (messages) => set({ messages }),

  setConversations: (conversations) => set({ conversations }),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  updateMessage: (id, content) =>
    set((state) => ({
      messages: state.messages.map((message) =>
        message.id === id ? { ...message, content } : message
      ),
    })),

  removeMessage: (id) =>
    set((state) => ({
      messages: state.messages.filter((message) => message.id !== id),
    })),

  setActiveConversation: (id) =>
    set({
      activeConversationId: id,
    }),

  startNewChat: () =>
    set({
      activeConversationId: null,
      messages: [],
    }),

  upsertConversation: (conversation) =>
    set((state) => ({
      conversations: [
        conversation,
        ...state.conversations.filter((item) => item.id !== conversation.id),
      ].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
    })),

  removeConversation: (id) =>
    set((state) => ({
      conversations: state.conversations.filter(
        (conversation) => conversation.id !== id
      ),
      messages: state.activeConversationId === id ? [] : state.messages,
      activeConversationId:
        state.activeConversationId === id ? null : state.activeConversationId,
    })),
}));
