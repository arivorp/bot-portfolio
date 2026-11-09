# Discord Bot Portfolio

Four production Discord bots I built and host on a Hetzner VPS (Ubuntu, managed with PM2). Each bot serves a different purpose across two active Discord communities with 150+ members.

## The Bots

### [/vena](./vena) — Community Management Platform
> Node.js · discord.js 14 · SQLite · Canvas · Express

The flagship bot — a full-featured server management system with 30+ slash commands, real-time staff performance tracking, automated moderation, giveaways, a web dashboard for ticket transcripts, and canvas-rendered server stat images.

**Highlights:**
- Staff performance scoring with automated promotions/demotions and monthly awards
- 13-event audit logging system (bans, role changes, message edits, channel updates, etc.)
- Join-to-Create temporary voice channels with a full button-based control panel
- Giveaway engine with role-gated entries and animated countdown
- Canvas-generated server stats wall (member counts, boost tier, icons)
- Web dashboard (Express) for browsing ticket transcripts behind PIN auth
- Welcome system with configurable DMs, auto-roles, selfie verification, and guild tag tracking
- Anti-invite filter, TOS word filter, profanity detection

### [/serum](./serum) — Server Setup & Panel Framework
> Node.js · discord.js 14

A lightweight bot focused on server setup automation. It generates persistent embed panels (rules, roles, info, help) from a single config file and provides Join-to-Create voice channels, self-assignable roles via button interactions, and standard moderation commands.

**Highlights:**
- Config-driven panel system — one `config.js` defines the entire server structure
- Reusable panel renderer with embed/plain-text modes, artwork attachments, and branded accents
- Self-role panels with button interactions and live member counts
- Help thread system with auto-archive and cooldowns
- Mass role assignment (`/massrole give/remove`) with rate limiting and safety checks

### [lily](./lily) — AI Companion Bot
> Python · discord.py · Groq API · Edge TTS · Pollinations AI

A conversational AI bot with a distinct personality. She responds in voice chat using speech-to-text and text-to-speech, generates images from prompts, and has per-channel conversation memory.

**Highlights:**
- AI chat with per-channel message history and custom system prompt
- Voice channel presence — joins VC, listens via Whisper STT, responds with Edge TTS
- AI-enhanced image generation (`/imagine`, `/imagine_dark`) via Pollinations with prompt engineering through Groq
- Whisper hallucination filtering (drops common false positives like "thanks for watching")

### [potprovider](./potprovider) — Utility Microservice
> Node.js · discord.js 14

A small utility bot running alongside the others on the same VPS. Handles auxiliary tasks that don't fit the main bots.

---

## Infrastructure

All four bots run on a single **Hetzner CPX11** VPS:
- **OS:** Ubuntu 22.04
- **Process Manager:** PM2 (auto-restart, log rotation)
- **Database:** SQLite via better-sqlite3 (zero-config, single-file)
- **Deploy:** rsync from local machine → PM2 restart

```
┌─────────────────────────────────────────┐
│              Hetzner VPS                │
│                                         │
│  ┌─────────┐  ┌─────────┐             │
│  │  vena   │  │  serum  │   PM2       │
│  │ (node)  │  │ (node)  │   manages   │
│  └─────────┘  └─────────┘   all four  │
│  ┌─────────┐  ┌─────────────┐         │
│  │  lily   │  │ potprovider │         │
│  │ (python)│  │   (node)    │         │
│  └─────────┘  └─────────────┘         │
│                                         │
│  SQLite DB ─── Express dashboard        │
└─────────────────────────────────────────┘
```

## Tech Stack

| Layer | Tools |
|-------|-------|
| Runtime | Node.js 18+, Python 3.11+ |
| Frameworks | discord.js 14, discord.py 2.3 |
| Database | SQLite (better-sqlite3) |
| AI/ML | Groq API (LLM + Whisper STT), Edge TTS, Pollinations |
| Graphics | @napi-rs/canvas (server-side image rendering) |
| Web | Express 5 |
| Voice | @discordjs/voice, PyNaCl, ffmpeg |
| Hosting | Hetzner VPS, PM2, rsync deploys |

## Code Snippets

Each bot's folder contains a `snippets/` directory with selected source files that demonstrate the architecture and key features. Secrets and tokens are excluded — `.env` files are never committed.

## Contact

**Arman** — [GitHub](https://github.com/arivorp) · armaan.txt@gmail.com
