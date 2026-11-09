'use strict';

/**
 * /serum — Panel Render Engine
 *
 * Central renderer that turns a panel definition into a Discord message payload.
 * Supports embed mode (branded color bar) and plain-text mode, with optional
 * artwork attachments, button components, and consistent typography.
 *
 * Every panel in the server — guidelines, roles, info, help, VC controls —
 * goes through this single render() function.
 */

const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const path = require('node:path');
const fs = require('node:fs');
const config = require('../config');

const { dot, arrow, rule } = config.sym;

/** Short hairline divider */
const divider = (width = 12) => `-# ${rule.repeat(width)}`;

/** ## title + -# subtitle */
function head(title, sub) {
  return sub ? `## ${title}\n-# ${sub}` : `## ${title}`;
}

/** "› label · text" — one line, no wrap */
const row = (label, text) =>
  text ? `${arrow} ${label} ${dot} ${text}` : `${arrow} ${label}`;

/** "**01** text" — numbered line */
const numbered = (n, text) => `**${String(n).padStart(2, '0')}** ${text}`;

/** Section label */
const section = (label) => `**${label}**`;

/** Quiet small line */
const note = (text) => `-# ${text}`;

/** Join with · */
const inline = (...parts) => parts.filter(Boolean).join(` ${dot} `);

/** Resolve artwork from assets/ directory */
function artwork(name) {
  if (!name) return null;
  const dir = path.join(__dirname, '..', '..', 'assets');
  for (const ext of ['png', 'jpg', 'jpeg', 'gif', 'webp']) {
    const file = path.join(dir, `${name}.${ext}`);
    if (!fs.existsSync(file)) continue;
    return {
      attachment: new AttachmentBuilder(file, { name: `${name}.${ext}` }),
      url: `attachment://${name}.${ext}`,
    };
  }
  return null;
}

/**
 * Panel definition → Discord message payload.
 *
 * A panel def can have: title, sub, body[], art, image, color, components[]
 * All are optional — a panel that's just artwork and buttons works fine.
 */
function render(def) {
  const parts = [];
  if (def.title) parts.push(head(def.title, def.sub));
  if (def.body?.length) {
    if (parts.length) parts.push('');
    parts.push(...def.body);
  }
  const body = parts.join('\n').trim();

  const components = def.components || [];
  const art = artwork(def.art);
  const files = art ? [art.attachment] : [];

  if (config.panelStyle === 'plain') {
    const payload = { components, files, allowedMentions: { parse: [] } };
    if (body) payload.content = body;
    return payload;
  }

  const embed = new EmbedBuilder().setColor(def.color ?? config.brand.accent);
  if (body) embed.setDescription(body);
  const image = art?.url ?? def.image ?? config.brand.banner;
  if (image) embed.setImage(image);
  return { embeds: [embed], components, files, allowedMentions: { parse: [] } };
}

module.exports = { divider, head, row, numbered, section, note, inline, render, artwork, dot, arrow, rule };
