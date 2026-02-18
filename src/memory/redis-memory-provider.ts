import { OpenAIEmbeddings } from "@langchain/openai";
import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";
import { getRedisClient, redisKey } from "../utils/redis.js";
import type { MemoryProvider } from "./provider.js";
import type { MemoryItem, MemorySearchResult } from "./types.js";

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

export class RedisMemoryProvider implements MemoryProvider {
  private embeddings = new OpenAIEmbeddings({ apiKey: env.OPENAI_API_KEY });

  async init(): Promise<void> {
    await getRedisClient();
  }

  async upsert(userId: string, text: string, tags: string[] = []): Promise<MemoryItem> {
    const redis = await getRedisClient();
    const now = new Date().toISOString();
    const item: MemoryItem = {
      id: randomUUID(),
      userId,
      text,
      tags,
      createdAt: now,
      updatedAt: now,
      embedding: await this.embeddings.embedQuery(text)
    };

    await redis.rPush(redisKey("memory", userId), JSON.stringify(item));
    await redis.lTrim(redisKey("memory", userId), -1000, -1);
    return item;
  }

  listRecent(userId: string, limit = 10): MemoryItem[] {
    // keep sync shape; runtime should rely on semanticSearch for redis memory retrieval.
    return [];
  }

  async semanticSearch(userId: string, query: string, limit = 5): Promise<MemorySearchResult[]> {
    const redis = await getRedisClient();
    const raw = await redis.lRange(redisKey("memory", userId), 0, -1);
    const items = raw
      .map((line) => {
        try {
          return JSON.parse(line) as MemoryItem;
        } catch {
          return null;
        }
      })
      .filter((x): x is MemoryItem => Boolean(x?.embedding?.length));

    const qEmbedding = await this.embeddings.embedQuery(query);

    return items
      .map((item) => ({ ...item, score: cosine(qEmbedding, item.embedding ?? []) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}
