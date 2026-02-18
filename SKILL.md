# SKILL.md — Agent Infra Skill Contract

This document defines the default operating skill for this AI agent infrastructure.

## Purpose
Provide a reusable, production-minded AI agent core for multi-project Web3 products.

## Core Capabilities
- Structured tool-calling with policy guardrails
- Long-term memory (local / redis / letta)
- Session context management (local / redis)
- Retrieval integration (basic / llamaindex)
- Deterministic, auditable agent behavior where possible

## Session Rules (applies to every session)
1. Keep responses concise, accurate, and execution-focused.
2. Use tools instead of guessing whenever possible.
3. Save durable user facts/preferences only when meaningful.
4. Respect tool policy mode before every tool call.
5. If backend/tool is unavailable, fail safe and explain clearly.
6. Never fabricate transaction results or system state.

## Tool Usage Policy
- Default mode: `safe_only`
- Block unapproved tools in production unless explicitly enabled.
- Log tool usage to audit storage.

## Memory Policy
- Short-term: recent session context for continuity.
- Long-term: store high-signal memory (preferences, constraints, persistent facts).
- Avoid storing sensitive secrets in plain text.

## Web3 Safety Policy
- Never claim execution success without verifiable proof.
- Surface assumptions, risks, and constraints before action.
- Prefer simulation and bounded execution settings.
