export type MemoryItem = {
  id: string;
  userId: string;
  text: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  embedding?: number[];
};

export type MemorySearchResult = MemoryItem & { score: number };
