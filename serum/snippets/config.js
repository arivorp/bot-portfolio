'use strict';

/**
 * /serum — Server Configuration
 *
 * Everything the bot needs to know about the server lives here.
 * One file defines identity, style, channels, roles, VC settings,
 * and help thread behavior. The bot reads this on startup and
 * creates/updates anything that's missing.
 */

module.exports = {
  // ── identity ───────────────────────────────────────────────
  brand: {
    name: '/serum',
    invite: 'discord.gg/serum',
    accent: 0x8fc93a,          // acid green — matches banner art
    accentDark: 0x2b2d31,      // discord embed bg — invisible bar
    banner: null,
  },

  // ── style ──────────────────────────────────────────────────
  // 'embed' → panels render inside an embed (colored left bar)
  // 'plain' → panels render as plain markdown (most minimal)
  panelStyle: 'embed',

  // The only decorative characters used anywhere. No emojis.
  sym: {
    dot: '·',
    arrow: '›',
    rule: '─',
    slot: ';',
  },

  // ── channels ───────────────────────────────────────────────
  // Fill IDs in, or leave "" to resolve by the name fragment.
  channels: {
    guidelines: { id: '', match: 'guidelines' },
    roles:      { id: '', match: 'roles' },
    info:       { id: '', match: 'info' },
    help:       { id: '', match: 'help' },
    announce:   { id: '', match: 'announce' },
    chat:       { id: '', match: 'chat' },
    icons:      { id: '', match: 'icons' },
    logs:       { id: '', match: 'logs' },
  },

  // ── roles ──────────────────────────────────────────────────
  roles: {
    separators: true,  // insert unclickable divider roles between tiers

    staff: [
      { key: 'owner',  name: 'owner',  color: 0x9800ff, hoist: true, perms: ['Administrator'] },
      { key: 'admin',  name: 'admin',  color: 0x8134ff, hoist: true, perms: [
        'ManageGuild', 'ManageRoles', 'ManageChannels', 'ManageMessages',
        'KickMembers', 'BanMembers', 'ModerateMembers',
      ] },
      { key: 'mod',    name: 'mod',    color: 0x6b84ff, hoist: true, perms: [
        'ManageMessages', 'KickMembers', 'ModerateMembers', 'ViewAuditLog',
      ] },
    ],

    // Self-assignable via the #roles panel
    self: [
      { key: 'giveaways', name: 'giveaways', color: 0x3f4a30, blurb: 'every giveaway that goes up' },
      { key: 'drops',     name: 'drops',     color: 0x3f4a30, blurb: 'icon sets, banners and lim releases' },
      { key: 'events',    name: 'events',    color: 0x3f4a30, blurb: 'games, vc nights, movie nights' },
      { key: 'updates',   name: 'updates',   color: 0x3f4a30, blurb: 'server announcements, nothing else' },
    ],
  },

  // ── join to create ─────────────────────────────────────────
  vc: {
    hubId: '',                    // the channel members click to get their own room
    categoryId: null,             // null = same category as the hub
    nameTemplate: '{user}',       // {user} replaced with display name
    userLimit: 0,
    bitrate: 64000,
    graceMs: 5000,                // ms after last person leaves before room is deleted
    maxPerUser: 1,
    padLabels: true,              // pad button labels for consistent width
  },

  // ── help threads ───────────────────────────────────────────
  help: {
    pingRole: 'mod',
    threadPrefix: 'help',
    autoArchiveMinutes: 1440,
    cooldownSeconds: 120,
  },
};
