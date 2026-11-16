export type MessageRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount?: number;
}

export interface APIMessage {
  role: MessageRole;
  content: string;
}

export interface ConversationMessageResponse {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

export interface APIConversationResponse {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    messages: number;
  };
  messages?: ConversationMessageResponse[];
}

export interface APIResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface StreamEvent {
  type: "conversation" | "token" | "done" | "error";
  conversationId?: string;
  content?: string;
  message?: string;
  model?: string;
}

export interface AIModel {
  name: string;
  size: number;
  modifiedAt: string;
}

export interface AIModelsResponse {
  models: AIModel[];
  defaultModel: string;
}
