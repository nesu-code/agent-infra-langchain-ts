import { OpenAIEmbeddings } from "@langchain/openai";
import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";
import { readJsonFile, writeJsonFile } from "../utils/json-store.js";
import type { MemoryItem, MemorySearchResult } from "./types.js";

const PATH = "src/data/memory.json";
const MAX_FAST_MEMORY = 200;

function cosine(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0;

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < len; i += 1) {
    dot += a[i]! * b[i]!;
    magA += a[i]! * a[i]!;
    magB += b[i]! * b[i]!;
  }

  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom > 0 ? dot / denom : 0;
}

export class MemoryManager {
  private items: MemoryItem[] = [];
  private fastByUser = new Map<string, MemoryItem[]>();
  private embeddings = new OpenAIEmbeddings({ apiKey: env.OPENAI_API_KEY });

  async init(): Promise<void> {
    this.items = await readJsonFile<MemoryItem[]>(PATH, []);
    for (const item of this.items) this.addToFast(item);
  }

  private addToFast(item: MemoryItem): void {
    const list = this.fastByUser.get(item.userId) ?? [];
    list.push(item);
    this.fastByUser.set(item.userId, list.slice(-MAX_FAST_MEMORY));
  }

  async upsert(userId: string, text: string, tags: string[] = []): Promise<MemoryItem> {
    const now = new Date().toISOString();
    const embedding = await this.embeddings.embedQuery(text);

    const item: MemoryItem = {
      id: randomUUID(),
      userId,
      text,
      tags,
      createdAt: now,
      updatedAt: now,
      embedding
    };

    this.items.push(item);
    this.addToFast(item);
    await writeJsonFile(PATH, this.items);
    return item;
  }

  listRecent(userId: string, limit = 10): MemoryItem[] {
    return (this.fastByUser.get(userId) ?? []).slice(-limit);
  }

  async semanticSearch(userId: string, query: string, limit = 5): Promise<MemorySearchResult[]> {
    const qEmbedding = await this.embeddings.embedQuery(query);
    const candidates = this.items.filter((x) => x.userId === userId && x.embedding?.length);

    return candidates
      .map((item) => ({ ...item, score: cosine(qEmbedding, item.embedding ?? []) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}
