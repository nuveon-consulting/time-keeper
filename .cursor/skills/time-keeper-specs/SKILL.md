---
name: time-keeper-specs
description: >-
  Read and update Time Keeper specifications under docs/spec/ when implementing
  or changing product behavior, UX, or architecture. Use for any
  feature work on the VS Code extension.
---

# Time Keeper specifications

## Trigger

- Implementing or changing user-visible behavior, commands, or persistence.
- Answering product or architecture questions about Time Keeper in this repo.

## Workflow

1. Open [docs/spec/README.md](../../../docs/spec/README.md) for the index and glossary.
2. Identify the owning doc:
   - Product goals and stories → [product.md](../../../docs/spec/product.md)
   - Commands, keybindings, status bar → [ux-commands.md](../../../docs/spec/ux-commands.md)
   - Modules, state, storage → [architecture.md](../../../docs/spec/architecture.md)
   - Local DB / remote sync → [persistence.md](../../../docs/spec/persistence.md)
   - MCP / AI timer control → [mcp.md](../../../docs/spec/mcp.md)
3. Implement code to match the spec; if the spec was wrong, **update the spec in the same change** (or note the follow-up PR).
4. Cross-check [AGENTS.md](../../../AGENTS.md) Definition of Done.

## Guardrails

- The shipped product is the VS Code/Cursor extension in [`packages/extension`](../../../packages/extension).
- Avoid duplicating long prose in AGENTS.md; keep depth in `docs/spec/`.

## Output

- Brief note of which spec files were read or updated and why.
