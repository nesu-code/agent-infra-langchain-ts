import { AIMessage, HumanMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { env } from "../config/env.js";
import type { MemoryManager } from "../memory/memory-manager.js";
import type { SessionManager } from "../session/session-manager.js";
import { buildToolkit } from "../tools/toolkit.js";

const SYSTEM_PROMPT = `You are an infra AI agent.
Rules:
- Be concise, actionable, and correct.
- Use memory_search for relevant past facts.
- Save durable preferences/facts with memory_save when user asks to remember.
- Use context_get if recent context is needed.
- Never fabricate tool results.`;

export class AgentRuntime {
  private model = new ChatOpenAI({
    apiKey: env.OPENAI_API_KEY,
    model: env.MODEL,
    temperature: 0.2
  });

  constructor(
    private readonly memory: MemoryManager,
    private readonly sessions: SessionManager
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

    const messages = [
      new SystemMessage(SYSTEM_PROMPT),
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
        const tool = toolMap.get(call.name);
        if (!tool) continue;
        const result = await (tool as any).invoke(call.args ?? {});
        messages.push(new ToolMessage({ tool_call_id: call.id ?? call.name, content: String(result) }));
      }
    }

    await this.sessions.append(session.id, "user", input.message);
    await this.sessions.append(session.id, "assistant", answer || "Acknowledged.");

    return { sessionId: session.id, message: answer || "Acknowledged." };
  }
}
