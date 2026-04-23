---
name: time-keeper-data-model
description: >-
  Time Keeper domain model: tasks, time entries, active timer state, resume stack,
  clock semantics, persistence, and export. Use when changing storage schema or
  timer logic.
---

# Time Keeper data model

## Trigger

- Adding or changing persistence, exports, or timer/task state transitions.
- Implementing start, stop, resume, or switch-task behavior.

## Workflow

1. Read [docs/spec/architecture.md](../../../docs/spec/architecture.md) for state machine and storage direction.
2. Read [docs/spec/persistence.md](../../../docs/spec/persistence.md) for v1 vs local DB vs remote sync boundaries.
3. Read [docs/spec/product.md](../../../docs/spec/product.md) for entities and user expectations.
4. Prefer **monotonic clock** (`performance.now()` / `hrtime`) for **elapsed duration** while running; store **wall-clock timestamps** for start/stop boundaries for human reports.
5. **Segments:** at most one `TimeEntry` with `end: null`. **Start**, **switch**, and **resume previous** each create a **new `Task` row** (new id) and a **new `TimeEntry`**; `lastStopped` captures title/description for resume only. **Duration** = `end − start` when stopped.
6. Schema changes: document migration approach (SQLite migrations vs JSONL versioning) in [architecture.md](../../../docs/spec/architecture.md); for sync or local server storage, update [persistence.md](../../../docs/spec/persistence.md) before shipping breaking changes.

## Guardrails

- Avoid double-counting overlapping intervals; stopping one entry must complete before starting another unless “switch” explicitly closes the prior entry.
- Exports must not include secrets.

## Output

- Entity/state diagram or bullet list of what changed and migration notes if any.
