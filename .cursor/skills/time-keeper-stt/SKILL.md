---
name: time-keeper-stt
description: >-
  Speech-to-text integration for Time Keeper: push-to-talk, provider abstraction,
  latency and error UX, and privacy red lines. Use when adding or changing voice
  capture or cloud STT calls.
---

# Time Keeper speech-to-text

## Trigger

- Implementing or changing microphone capture, audio encoding, or STT API calls.
- Choosing or swapping STT providers.

## Workflow

1. Read [docs/spec/speech-to-text.md](../../../docs/spec/speech-to-text.md) for provider options and extension constraints.
2. Implement **user-initiated** capture only (command or keybinding); release mic when done.
3. Abstract the vendor behind a small interface (e.g. `transcribe(audio): Promise<string>`) so Whisper vs Deepgram can swap without touching UI.
4. Store API keys in **SecretStorage**; support optional env-based config for advanced users.
5. Define failure UX: network errors, rate limits, empty transcript — surface clear messages; no silent drops.

## Guardrails

- **No always-listening** hot path in production code.
- **Never** log raw audio bytes or full transcripts at default log levels; redact in diagnostic flows.
- Document data sent to third parties in [speech-to-text.md](../../../docs/spec/speech-to-text.md).

## Output

- Provider interface summary and which user settings/env vars apply.
