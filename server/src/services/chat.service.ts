
import { OllamaProvider } from "./ai/ollama.provider.js";
import type { AIMessage } from "./ai/ai-provider.interface.js";

const aiProvider = new OllamaProvider();

const SYSTEM_PROMPT =
  "You are Nexa AI, a helpful, accurate, and friendly AI assistant. Give clear and useful answers.";

const prepareMessages = (messages: AIMessage[]): AIMessage[] => [
  {
    role: "system",
    content: SYSTEM_PROMPT,
  },
  ...messages,
];

export const getAvailableModels = async () => {
  return aiProvider.listModels();
};

export const generateChatResponse = async (
  messages: AIMessage[],
  model?: string
): Promise<string> => {
  return aiProvider.chat(prepareMessages(messages), model);
};

export const generateChatStream = (
  messages: AIMessage[],
  model?: string
): AsyncGenerator<string> => {
  return aiProvider.chatStream(prepareMessages(messages), model);
};
