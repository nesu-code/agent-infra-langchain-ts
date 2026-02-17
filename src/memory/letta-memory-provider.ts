import type { MemoryItem, MemorySearchResult } from "./types.js";
import type { MemoryProvider } from "./provider.js";

/**
 * Stub adapter for Letta (MemGPT).
 * Replace internals with Letta SDK/API calls.
 */
export class LettaMemoryProvider implements MemoryProvider {
  async init(): Promise<void> {
    // TODO: initialize Letta client and health-check.
  }

  async upsert(userId: string, text: string, tags: string[] = []): Promise<MemoryItem> {
    const now = new Date().toISOString();
    return {
      id: `letta-${Date.now()}`,
      userId,
      text,
      tags,
      createdAt: now,
      updatedAt: now
    };
  }

  listRecent(_userId: string, _limit = 10): MemoryItem[] {
    return [];
  }

  async semanticSearch(_userId: string, _query: string, _limit = 5): Promise<MemorySearchResult[]> {
    return [];
  }
}
