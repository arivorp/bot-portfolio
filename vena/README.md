# /vena — Community Management Platform

A full-featured Discord server management bot built with Node.js and discord.js 14. Handles everything from moderation and welcome flows to staff performance analytics and giveaways.

## Features

### Moderation & Safety
- **Staff Audit System** — 13 separate event listeners track bans, unbans, role changes, channel creates/deletes/updates, message edits/deletes/bulk-deletes, and webhook changes. Each event logs to a dedicated staff channel with before/after diffs.
- **Staff Performance Scoring** — Tracks moderation actions per staff member (bans, kicks, timeouts, message deletes, channel changes). Calculates weighted scores, enables `/staffstats` leaderboards, and powers automated monthly staff-of-the-month awards.
- **Auto Promote/Demote** — Staff tiers (Trial Mod → Mod → Senior Mod) with `/promote` and `/demote` commands that automatically swap role assignments.
- **Anti-Invite Filter** — Catches `discord.gg/*` links from non-staff members, deletes them, and logs the attempt.
- **TOS Filter** — Scans messages against a profanity/TOS word list with configurable actions.
- **Report System** — Members can `/report` users, which creates a staff-visible thread with context.

### Welcome & Onboarding
- **Configurable Welcome Messages** — `/setwelcome` sets per-channel DM or in-channel welcome messages with `{user}`, `{server}`, `{count}` placeholders.
- **Selfie Verification** — `/selfieverify` sets up a verification flow: user submits a selfie via DM, staff approve/deny via buttons, verified role is assigned on approval.
- **Auto-Roles** — `/setautorole` assigns roles on join.
- **Join Ping** — Pings specific channels when a new member joins (separate from welcome messages).
- **Guild Tag Tracking** — Monitors `guildMemberUpdate` events to auto-assign a role when members equip the server's clan tag. Includes a periodic full-member scan on startup.

### Interactive Panels
- **Role Panels** — `/rolespanel` posts button-based self-role panels. Members click to toggle roles.
- **Color Panels** — `/colorpanel` lets members pick a name color from button options.
- **Help Panel** — Creates a help thread system with auto-archive and staff pings.
- **VC Panel** — Join-to-Create voice channels with a button control panel (lock, unlock, rename, set limit, kick, claim ownership).
- **Profile Panel** — Members can set custom profile fields.
- **Uploader Panel** — Submission system for user-generated content.

### Giveaways
- Full giveaway lifecycle: create → enter via button → countdown → draw winner(s)
- Role-gated entries (require specific roles to participate)
- Animated countdown timer in the embed
- Reroll support

### Fun & Utility
- `/8ball`, `/tarot`, `/poll` — Community engagement commands
- `/avatar` — Display any user's avatar in full size
- `/fame` and `/shame` — Highlight or call out users (fun, not moderation)
- `/tr` — Google Translate integration
- `/uwulock` / `/uwuunlock` — Force-translates a user's messages to uwu speak
- `/search` — DuckDuckGo search results in Discord
- `/serverstats` — Server statistics embed
- `/reminder` — Set personal reminders
- `/wall` — Canvas-rendered server stats image (member count, boost tier, server icon)

### Web Dashboard
- Express server serving a PIN-protected staff dashboard
- Browse and search ticket transcripts
- Brute-force protection (5 attempts per IP per 15 minutes)
- Session tokens derived from SHA-256 hashed PINs

### Canvas Rendering
- Server stat walls generated with `@napi-rs/canvas`
- Dynamic text, icons, and member counts rendered server-side as PNG images

## Architecture

```
cord/
├── index.js                    # Entry point — client setup, intent registration
├── config.js                   # Server configuration
├── deploy-commands.js          # Slash command registration
├── src/
│   ├── commands/
│   │   ├── admin/              # Admin-only commands
│   │   ├── fun/                # Community commands (8ball, avatar, poll, etc.)
│   │   ├── giveaway/           # Giveaway lifecycle
│   │   ├── moderation/         # Staff tools (ban, kick, purge, staffstats, etc.)
│   │   └── welcome/            # Onboarding setup commands
│   ├── events/
│   │   ├── ready.js            # Startup: voice cleanup, tag scan, intervals
│   │   ├── messageCreate.js    # Message handling, filters, auto-responses
│   │   ├── guildMemberAdd.js   # Welcome messages, auto-roles, join pings
│   │   ├── voiceStateUpdate.js # JTC voice channels
│   │   └── staffAudit_*.js     # 13 audit event listeners
│   ├── handlers/
│   │   ├── commandHandler.js   # Dynamic command loading from /commands
│   │   └── eventHandler.js     # Dynamic event loading from /events
│   ├── utils/
│   │   ├── staffPerformance.js # Score tracking, leaderboard, auto-promote
│   │   ├── staffAudit.js       # Centralized audit log formatting
│   │   ├── giveaways.js        # Giveaway engine
│   │   ├── vcControls.js       # VC panel button handler
│   │   ├── embeds.js           # Standardized embed builders
│   │   ├── theme.js            # Dynamic emoji resolution, brand colors
│   │   ├── tosFilter.js        # Profanity/TOS word detection
│   │   ├── wall.js             # Canvas stat image renderer
│   │   └── ...
│   └── data/
│       └── database.js         # SQLite setup, table creation, migrations
└── web/
    ├── server.js               # Express dashboard backend
    └── public/                 # Static frontend assets
```

## Tech Stack

- **Runtime:** Node.js 18+
- **Framework:** discord.js 14.25
- **Database:** SQLite via better-sqlite3
- **Graphics:** @napi-rs/canvas
- **Web:** Express 5
- **Voice:** @discordjs/voice, ffmpeg, sodium-native
- **APIs:** Google Translate, DuckDuckGo, Google TTS
