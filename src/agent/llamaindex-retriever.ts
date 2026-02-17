import type { RetrievedContext, RetrieverProvider } from "./retriever-provider.js";

/**
 * Stub adapter for LlamaIndex-based RAG retrieval.
 */
export class LlamaIndexRetriever implements RetrieverProvider {
  async retrieve(_userId: string, _query: string, _limit = 5): Promise<RetrievedContext[]> {
    // TODO: integrate llamaindex-ts query engine here.
    return [];
  }
}
