import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  MODEL: z.string().default("gpt-4.1-mini"),
  PORT: z.coerce.number().default(8787),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  TOOL_POLICY_MODE: z.enum(["allow_all", "safe_only"]).default("safe_only"),
  MEMORY_BACKEND: z.enum(["local", "letta"]).default("local"),
  RAG_BACKEND: z.enum(["none", "llamaindex"]).default("none")
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid env:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
