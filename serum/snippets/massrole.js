'use strict';

/**
 * /massrole — Bulk role assignment with safety checks
 *
 * Give or remove a role to/from every member in the server.
 * Supports filtering by humans only, bots only, or everyone.
 * Rate-limited to avoid Discord API throttling.
 */

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { done, fail } = require('../lib/reply');
const { dot } = require('../lib/style');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('massrole')
    .setDescription('give or remove a role to/from everyone')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addSubcommand((s) =>
      s.setName('give')
        .setDescription('give a role to every member')
        .addRoleOption((o) =>
          o.setName('role').setDescription('the role to give').setRequired(true))
        .addStringOption((o) =>
          o.setName('filter').setDescription('who to target')
            .addChoices(
              { name: 'everyone', value: 'all' },
              { name: 'humans only', value: 'humans' },
              { name: 'bots only', value: 'bots' },
            )))
    .addSubcommand((s) =>
      s.setName('remove')
        .setDescription('remove a role from every member')
        .addRoleOption((o) =>
          o.setName('role').setDescription('the role to remove').setRequired(true))
        .addStringOption((o) =>
          o.setName('filter').setDescription('who to target')
            .addChoices(
              { name: 'everyone', value: 'all' },
              { name: 'humans only', value: 'humans' },
              { name: 'bots only', value: 'bots' },
            ))),

  async execute(interaction) {
    const action = interaction.options.getSubcommand();
    const role = interaction.options.getRole('role');
    const filter = interaction.options.getString('filter') || 'all';

    // ── safety checks ──────────────────────────────────────
    const me = interaction.guild.members.me;
    if (role.managed)
      return fail(interaction, `**${role.name}** is managed by an integration ${dot} can't touch it.`);
    if (role.id === interaction.guild.id)
      return fail(interaction, `can't mass-assign @everyone.`);
    if (role.position >= me.roles.highest.position)
      return fail(interaction, `**${role.name}** sits above my highest role ${dot} drag me higher first.`);

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // ── fetch & filter ──────────────────────────────────────
    const members = await interaction.guild.members.fetch();
    const targets = members.filter((m) => {
      if (filter === 'humans' && m.user.bot) return false;
      if (filter === 'bots' && !m.user.bot) return false;
      return action === 'give' ? !m.roles.cache.has(role.id) : m.roles.cache.has(role.id);
    });

    const label = filter === 'all' ? 'members' : filter;

    if (!targets.size) {
      const already = action === 'give' ? 'already have' : 'don\'t have';
      return done(interaction, `all ${label} ${already} **${role.name}**.`);
    }

    await interaction.editReply({
      content: `${action === 'give' ? 'giving' : 'removing'} **${role.name}** ${action === 'give' ? 'to' : 'from'} **${targets.size}** ${label}...`,
    });

    // ── process with rate limiting ─────────────────────────
    let ok = 0;
    let bad = 0;

    for (const [, member] of targets) {
      try {
        if (action === 'give') await member.roles.add(role);
        else await member.roles.remove(role);
        ok++;
      } catch {
        bad++;
      }
      // Pause 1s every 10 members to avoid API rate limits
      if ((ok + bad) % 10 === 0) await new Promise((r) => setTimeout(r, 1000));
    }

    const verb = action === 'give' ? 'given to' : 'removed from';
    const summary = `**${role.name}** ${verb} **${ok}** ${label}${bad ? ` ${dot} ${bad} failed` : ''}`;
    return done(interaction, summary);
  },
};
