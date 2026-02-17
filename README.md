# Agent Infra (LangChain + TypeScript)

Reusable AI Agent infrastructure for multi-project use.

## Features
- **Long-term memory** (persistent semantic memory per user)
- **Fast memory** (in-memory cache of latest memory items)
- **Session per user** (persistent session history)
- **Context management** (recent context window)
- **Pluggable memory backend** (`local` / `letta`)
- **Pluggable RAG backend** (`none` / `llamaindex`)
- **Structured tools + tool-calling**
- **Tool policy guardrail** (`safe_only` / `allow_all`)
- **Tool audit log** for observability
- **Clean architecture** (DRY, KISS, composable)

## Stack
- Fastify API
- LangChain (`@langchain/openai`, `@langchain/core`)
- Zod validation
- JSON-backed persistence (simple infra-first default)

## Quickstart
```bash
cp .env.example .env
npm install
npm run dev
```

## API
### `POST /v1/chat`
```json
{
  "userId": "jar",
  "sessionId": "optional",
  "message": "remember i prefer low risk"
}
```

Response:
```json
{
  "ok": true,
  "sessionId": "...",
  "message": "..."
}
```

## Built-in Tools
- `memory_save` → persist long-term memory
- `memory_search` → semantic recall
- `context_get` → read recent session context
- `time_now` → UTC timestamp

## Project Structure
```txt
src/
  agent/runtime.ts
  api/schemas.ts
  config/env.ts
  memory/
    memory-manager.ts
    types.ts
  session/session-manager.ts
  tools/toolkit.ts
  utils/json-store.ts
  server.ts
```

## Policy & Audit
- `TOOL_POLICY_MODE=safe_only` allows only vetted tools.
- `TOOL_POLICY_MODE=allow_all` allows all registered tools.
- Tool calls are logged to `src/data/tool-audit.json`.

## Backend Switches
- `MEMORY_BACKEND=local|letta`
- `RAG_BACKEND=none|llamaindex`

`letta` adapter expects:
- `POST /v1/memory/upsert`
- `POST /v1/memory/search`
- `GET /health`

`llamaindex` adapter expects:
- `POST /v1/retrieve`

If endpoint/API contracts differ in your deployment, edit adapter files only (core runtime unchanged).

## Production Upgrade Path
- Replace JSON store with Postgres/Redis
- Add auth + tenant isolation
- Add rate limiting + observability
- Expand tool policy to role/tenant-based permissions
- Add eval/test suite for tool-calling reliability
