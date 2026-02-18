import Fastify from "fastify";
import { env } from "./config/env.js";
import { AgentRuntime } from "./agent/runtime.js";
import { ChatRequestSchema } from "./api/schemas.js";
import { createMemoryProvider } from "./memory/factory.js";
import { createRetrieverProvider } from "./agent/retriever-factory.js";
import { createSessionProvider } from "./session/factory.js";
import { RAGStore } from "./rag/store.js";
import { RAGService } from "./rag/service.js";
import { RAGIngestSchema, RAGJobQuerySchema, RAGSearchSchema } from "./rag/schemas.js";

const app = Fastify({ logger: true });

const memory = createMemoryProvider();
const sessions = createSessionProvider();
const retriever = createRetrieverProvider();
const runtime = new AgentRuntime(memory, sessions, retriever);
const ragStore = new RAGStore();
const rag = new RAGService(ragStore);

app.get("/health", async () => ({ ok: true, service: "agent-infra-langchain-ts" }));

app.post("/v1/rag/ingest", async (req, reply) => {
  const parsed = RAGIngestSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ ok: false, error: parsed.error.flatten() });
  }

  try {
    const result = await rag.ingest({
      tenantId: parsed.data.tenantId,
      source: parsed.data.source,
      content: parsed.data.content,
      ...(parsed.data.metadata ? { metadata: parsed.data.metadata } : {})
    });
    return { ok: true, ...result };
  } catch (error) {
    req.log.error({ err: error }, "rag_ingest_failed");
    return reply.code(500).send({ ok: false, error: "RAG ingest failed" });
  }
});

app.get("/v1/rag/jobs/:jobId", async (req, reply) => {
  const parsed = RAGJobQuerySchema.safeParse(req.params);
  if (!parsed.success) {
    return reply.code(400).send({ ok: false, error: parsed.error.flatten() });
  }

  const job = rag.getJob(parsed.data.jobId);
  if (!job) return reply.code(404).send({ ok: false, error: "Job not found" });
  return { ok: true, job };
});

app.get("/v1/rag/search", async (req, reply) => {
  const parsed = RAGSearchSchema.safeParse(req.query);
  if (!parsed.success) {
    return reply.code(400).send({ ok: false, error: parsed.error.flatten() });
  }

  const items = rag.query(parsed.data.tenantId, parsed.data.query, parsed.data.limit);
  return { ok: true, items };
});

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
  await ragStore.init();
  await app.listen({ port: env.PORT, host: "0.0.0.0" });
}

bootstrap();
