import { z } from "zod";

export const ChatRequestSchema = z.object({
  userId: z.string().min(1),
  sessionId: z.string().optional(),
  message: z.string().min(1)
});
