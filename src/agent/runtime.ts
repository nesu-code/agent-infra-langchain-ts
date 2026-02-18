import { AIMessage, HumanMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { env } from "../config/env.js";
import { buildSessionPersonaPrompt } from "../config/persona.js";
import type { MemoryProvider } from "../memory/provider.js";
import type { SessionProvider } from "../session/provider.js";
import { buildToolkit } from "../tools/toolkit.js";
import { appendToolAudit } from "../tools/audit.js";
import { deniedToolMessage, isToolAllowed } from "../tools/policy.js";
import type { RetrieverProvider } from "./retriever-provider.js";

const BASE_SYSTEM_PROMPT = `You are an infra AI agent.
Rules:
- Be concise, actionable, and correct.
- Use memory_search for relevant past facts.
- Save durable preferences/facts with memory_save when user asks to remember.
- Use context_get if recent context is needed.
- Never fabricate tool results.
- If a tool is blocked by policy, continue safely without it.`;

const SESSION_PERSONA_PROMPT = buildSessionPersonaPrompt();
const SYSTEM_PROMPT = [BASE_SYSTEM_PROMPT, SESSION_PERSONA_PROMPT].filter(Boolean).join("\n\n");

export class AgentRuntime {
  private model = new ChatOpenAI({
    apiKey: env.OPENAI_API_KEY,
    model: env.MODEL,
    temperature: 0.2
  });

  constructor(
    private readonly memory: MemoryProvider,
    private readonly sessions: SessionProvider,
    private readonly retriever: RetrieverProvider
  ) {}

  async chat(input: { userId: string; sessionId?: string; message: string }) {
    const session = this.sessions.ensureSession(input.userId, input.sessionId);
    const toolkit = buildToolkit({
      userId: input.userId,
      sessionId: session.id,
      memory: this.memory,
      sessions: this.sessions
    });

    const toolMap = new Map(toolkit.map((t) => [t.name, t]));
    const model = this.model.bindTools(toolkit);

    const recentContext = this.sessions.getRecentContext(session.id, 10);
    const retrieved = await this.retriever.retrieve(input.userId, input.message, 4);

    const messages = [
      new SystemMessage(SYSTEM_PROMPT),
      ...(retrieved.length
        ? [
            new SystemMessage(
              `Retrieved knowledge:\n${retrieved
                .map((x, i) => `${i + 1}. (${x.score.toFixed(2)}) ${x.content}`)
                .join("\n")}`
            )
          ]
        : []),
      ...recentContext.map((m) => (m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content))),
      new HumanMessage(input.message)
    ];

    let answer = "";

    for (let i = 0; i < 4; i += 1) {
      const ai = await model.invoke(messages);
      messages.push(ai);

      if (!ai.tool_calls?.length) {
        answer = typeof ai.content === "string" ? ai.content : JSON.stringify(ai.content);
        break;
      }

      for (const call of ai.tool_calls) {
        const toolName = call.name;
        const tool = toolMap.get(toolName);
        const callId = call.id ?? toolName;

        if (!tool) {
          messages.push(new ToolMessage({ tool_call_id: callId, content: `Unknown tool: ${toolName}` }));
          continue;
        }

        const allowed = isToolAllowed(toolName);
        if (!allowed) {
          const blocked = deniedToolMessage(toolName);
          await appendToolAudit({
            at: new Date().toISOString(),
            userId: input.userId,
            sessionId: session.id,
            toolName,
            allowed,
            args: call.args ?? {}
          });
          messages.push(new ToolMessage({ tool_call_id: callId, content: blocked }));
          continue;
        }

        const result = await (tool as any).invoke(call.args ?? {});
        const resultText = String(result);
        await appendToolAudit({
          at: new Date().toISOString(),
          userId: input.userId,
          sessionId: session.id,
          toolName,
          allowed,
          args: call.args ?? {},
          resultPreview: resultText.slice(0, 280)
        });

        messages.push(new ToolMessage({ tool_call_id: callId, content: resultText }));
      }
    }

    await this.sessions.append(session.id, "user", input.message);
    await this.sessions.append(session.id, "assistant", answer || "Acknowledged.");

    return { sessionId: session.id, message: answer || "Acknowledged." };
  }
}
