import type { MemoryItem, MemorySearchResult } from "./types.js";

export type MemoryProvider = {
  init(): Promise<void>;
  upsert(userId: string, text: string, tags?: string[]): Promise<MemoryItem>;
  listRecent(userId: string, limit?: number): MemoryItem[];
  semanticSearch(userId: string, query: string, limit?: number): Promise<MemorySearchResult[]>;
};
