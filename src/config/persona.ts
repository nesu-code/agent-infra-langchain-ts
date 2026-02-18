import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function safeRead(relativePath: string): string {
  try {
    return readFileSync(resolve(process.cwd(), relativePath), "utf8").trim();
  } catch {
    return "";
  }
}

export function buildSessionPersonaPrompt(): string {
  const soul = safeRead("SOUL.md");
  const character = safeRead("CHARACTER.md");
  const skill = safeRead("SKILL.md");

  const sections = [
    soul ? `SOUL:\n${soul}` : "",
    character ? `CHARACTER:\n${character}` : "",
    skill ? `SKILL:\n${skill}` : ""
  ].filter(Boolean);

  return sections.join("\n\n");
}
