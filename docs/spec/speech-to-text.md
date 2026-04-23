# Speech-to-text

## Goals

- **High-quality** transcription for short task utterances (few seconds).
- **Low friction** without always-on mic: **push-to-talk** or hold-to-talk bound to a key/command.
- **Cross-platform** behavior inside the extension (same code path on macOS and Windows).

## Provider comparison (initial)

| Option | Strengths | Tradeoffs |
|--------|-----------|-----------|
| **OpenAI Whisper API** | Excellent accuracy, simple request/response, widely used | Network latency; sends audio to OpenAI; non-streaming batch model |
| **Deepgram** | Streaming, low latency, good for live UX | Third-party dependency; pricing model differs |
| **Azure / Google Cloud STT** | Enterprise controls, regions | More setup; heavier SDK surface |

**Default recommendation for v1:** start with **Whisper API** behind a narrow `TranscriptionProvider` interface for ease of integration; keep **Deepgram** as a documented alternative if streaming UX becomes critical.

## Audio capture (extension)

- Use **user gesture** initiated recording (command or keybinding).
- Encode to a format the provider accepts (e.g. WAV/FLAC/OGG — follow provider docs).
- **Release microphone** when recording ends or on timeout.

## Secrets and configuration

- **API keys:** VS Code `SecretStorage` (preferred) or environment variable documented for power users.
- Never log raw API responses containing user content at default verbosity.

## Offline and failure behavior

- If offline or API errors: show actionable message; offer **fallback to typed input** via Quick Pick or input box.
- Rate limits: backoff + user-visible notice.

## Privacy

- Document that **audio is sent to the chosen provider** when STT is used.
- No always-on background recording.
- Redact transcripts in diagnostic bundles unless user explicitly opts in.

## Swapping providers

Implement:

```text
transcribe(audio: EncodedAudio, options): Promise<TranscriptResult>
```

Map provider-specific auth and endpoints behind this interface; update this doc when adding a provider.
