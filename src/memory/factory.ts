import { env } from "../config/env.js";
import { LettaMemoryProvider } from "./letta-memory-provider.js";
import { LocalMemoryProvider } from "./local-memory-provider.js";
import type { MemoryProvider } from "./provider.js";

export function createMemoryProvider(): MemoryProvider {
  if (env.MEMORY_BACKEND === "letta") return new LettaMemoryProvider();
  return new LocalMemoryProvider();
}
