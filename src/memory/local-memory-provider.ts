import { MemoryManager } from "./memory-manager.js";
import type { MemoryProvider } from "./provider.js";

export class LocalMemoryProvider implements MemoryProvider {
  private manager = new MemoryManager();

  async init(): Promise<void> {
    await this.manager.init();
  }

  upsert(userId: string, text: string, tags: string[] = []) {
    return this.manager.upsert(userId, text, tags);
  }

  listRecent(userId: string, limit = 10) {
    return this.manager.listRecent(userId, limit);
  }

  semanticSearch(userId: string, query: string, limit = 5) {
    return this.manager.semanticSearch(userId, query, limit);
  }
}
