
export type AIMessageRole = "system" | "user" | "assistant";

export interface AIMessage {
  role: AIMessageRole;
  content: string;
}

export interface AIModel {
  name: string;
  size: number;
  modifiedAt: string;
}

export interface AIProvider {
  chat(messages: AIMessage[], model?: string): Promise<string>;

  chatStream(
    messages: AIMessage[],
    model?: string
  ): AsyncGenerator<string>;

  listModels(): Promise<AIModel[]>;
}
