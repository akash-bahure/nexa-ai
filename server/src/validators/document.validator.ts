import { z } from "zod";

export const ragQuerySchema = z.object({
  query: z.string().trim().min(1).max(2000),
  documentIds: z.array(z.string().uuid()).min(1).max(10),
  model: z.string().trim().min(1).max(120).optional(),
  conversationId: z.string().uuid().optional(),
});

export type RAGQueryInput = z.infer<typeof ragQuerySchema>;
