import Fastify from "fastify";
import { env } from "./config/env.js";
import { AgentRuntime } from "./agent/runtime.js";
import { ChatRequestSchema } from "./api/schemas.js";
import { createMemoryProvider } from "./memory/factory.js";
import { createRetrieverProvider } from "./agent/retriever-factory.js";
import { createSessionProvider } from "./session/factory.js";

const app = Fastify({ logger: true });

const memory = createMemoryProvider();
const sessions = createSessionProvider();
const retriever = createRetrieverProvider();
const runtime = new AgentRuntime(memory, sessions, retriever);

app.get("/health", async () => ({ ok: true, service: "agent-infra-langchain-ts" }));

app.post("/v1/chat", async (req, reply) => {
  const parsed = ChatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ ok: false, error: parsed.error.flatten() });
  }

  try {
    const result = await runtime.chat({
      userId: parsed.data.userId,
      message: parsed.data.message,
      ...(parsed.data.sessionId ? { sessionId: parsed.data.sessionId } : {})
    });
    return { ok: true, ...result };
  } catch (error) {
    req.log.error({ err: error }, "chat_failed");
    return reply.code(500).send({ ok: false, error: "Internal server error" });
  }
});

async function bootstrap() {
  await memory.init();
  await sessions.init();
  await app.listen({ port: env.PORT, host: "0.0.0.0" });
}

bootstrap();
