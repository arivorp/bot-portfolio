# lily — AI Companion Bot

A conversational AI Discord bot built with Python and discord.py. Lily has a distinct personality, responds in text and voice, generates images from prompts, and maintains per-channel conversation memory.

## Features

### AI Chat
- Conversational responses powered by Groq API (LLM inference)
- Per-channel message history — Lily remembers context within each channel
- Custom system prompt that defines her personality and tone
- Responds when mentioned, replied to, or in DMs
- Bad-response filtering to keep outputs in character

### Voice Presence
- `/join` and `/leave` — Lily joins voice channels
- **Speech-to-Text** — Listens to voice chat via Whisper (Groq's STT endpoint)
- **Text-to-Speech** — Responds in voice using Edge TTS (`en-US-AriaNeural` voice)
- **Hallucination filtering** — Drops common Whisper false positives ("thanks for watching", ".", single words) to avoid nonsense responses
- Async audio pipeline: record → transcribe → generate response → synthesize speech → play

### AI Image Generation
- `/imagine <prompt>` — Generates images via Pollinations AI (Flux model)
- `/imagine_dark <prompt>` — Dark/gothic variant with adjusted style parameters
- **AI prompt enhancement** — Short/slang prompts are expanded into detailed image generation prompts via Groq before being sent to Pollinations. This dramatically improves output quality.
- 1024x1024 output, random seeds for variety

### Fun Commands
- Community engagement commands
- Interactive responses with personality-consistent formatting

## Architecture

```
lily/
├── main.py               # Entry point — bot class, cog loading, command sync
├── cogs/
│   ├── ai_chat.py        # LLM chat with per-channel history
│   ├── voice.py          # VC join/leave, STT listening, TTS responses
│   ├── image_gen.py      # /imagine commands with AI prompt enhancement
│   └── fun.py            # Community commands
└── requirements.txt
```

## Tech Stack

- **Runtime:** Python 3.11+
- **Framework:** discord.py 2.3+
- **AI:** Groq API (LLM chat + Whisper STT)
- **TTS:** Edge TTS (Microsoft's neural voices)
- **Image Gen:** Pollinations AI (Flux model)
- **Voice:** PyNaCl, discord.py voice_recv extension
