# /serum — Server Setup & Panel Framework

A config-driven Discord bot that automates server setup. Define your server's roles, channels, panels, and branding in a single `config.js` — the bot creates missing roles, generates persistent embed panels, and manages Join-to-Create voice channels.

## Features

### Config-Driven Architecture
The entire server structure lives in one config file:
- **Brand identity** — name, accent color, invite link, banner image
- **Panel style** — embed (colored sidebar) or plain markdown
- **Decorative symbols** — `·`, `›`, `─` (no emojis, ever)
- **Channel mappings** — resolve by ID or fuzzy name match
- **Role definitions** — staff tiers with permissions, community roles, self-assignable roles
- **VC settings** — hub channel, room naming template, bitrate, grace period

### Panel System
`/panel` generates persistent server panels from config:
- **Guidelines** — server rules with numbered formatting
- **Roles** — self-assignable role buttons with live member counts
- **Info** — server information and links
- **Help** — creates help threads with staff pings and auto-archive
- **VC** — voice channel controls

Each panel is rendered through a central `render()` function that supports:
- Embed mode (branded color bar) or plain-text mode
- Optional artwork attachments (`attachment://` protocol)
- Button components and action rows
- Consistent typography using the config's symbol set

### Join-to-Create Voice Channels
- Members join a hub channel → bot creates a private room named after them
- Button panel for room controls: lock, unlock, rename, set user limit, kick members
- Grace period before cleanup (configurable, prevents accidental deletion on reconnect)
- Per-user room limit (default: 1 room per person)

### Moderation
- `/ban`, `/kick`, `/timeout`, `/untimeout` — Standard mod commands with reason logging
- `/purge` — Bulk message deletion
- `/lock` / unlock channels
- `/slowmode` — Set channel slowmode
- `/massrole give/remove` — Assign or remove a role from every member (with filters: humans only, bots only, everyone). Rate-limited at 1s per 10 members with safety checks for managed roles and hierarchy.

### Setup Automation
`/setup` provisions the entire server in one command:
- Creates missing roles from config (staff, community, self-assignable)
- Sets permissions, colors, and hoist flags
- Inserts separator roles between tiers
- Resolves or creates channels

## Architecture

```
serum/
├── src/
│   ├── index.js              # Entry point
│   ├── config.js             # Single source of truth for the server
│   ├── deploy-commands.js    # Slash command registration
│   ├── commands/
│   │   ├── setup.js          # Full server provisioning
│   │   ├── panel.js          # Panel generation
│   │   ├── massrole.js       # Bulk role operations
│   │   ├── ban.js, kick.js   # Moderation commands
│   │   └── ...
│   ├── events/
│   │   ├── ready.js          # Startup logging
│   │   ├── interactionCreate.js  # Command + button router
│   │   └── voiceStateUpdate.js   # JTC voice system
│   ├── panels/
│   │   ├── index.js          # Panel registry
│   │   ├── guidelines.js     # Rules panel
│   │   ├── roles.js          # Self-role panel
│   │   ├── help.js           # Help thread panel
│   │   ├── info.js           # Server info panel
│   │   └── vc.js             # Voice control panel
│   └── lib/
│       ├── style.js          # Render engine (embeds, typography, artwork)
│       ├── reply.js          # Standardized success/error responses
│       ├── resolve.js        # Channel/role resolution helpers
│       ├── store.js          # Persistent data storage
│       ├── vc.js             # Voice channel management
│       └── time.js           # Duration parsing
└── assets/                   # Panel artwork (banners, icons)
```

## Tech Stack

- **Runtime:** Node.js 18+
- **Framework:** discord.js 14.16
- **Design:** Zero external dependencies beyond discord.js and dotenv
