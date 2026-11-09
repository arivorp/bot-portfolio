/**
 * Staff Audit Logging System
 *
 * Monitors 13 gateway events to track staff actions across the server.
 * Audit logs are posted to a SEPARATE guild so the trail survives
 * even if the main server is compromised.
 *
 * Strategy:
 *   - Gateway events tell us WHAT changed (role updated, channel deleted, etc.)
 *   - Discord's audit log tells us WHO did it
 *   - If the actor matches our staff role list, we post a detailed embed
 *
 * Tracked events:
 *   guildBanAdd, guildBanRemove, guildMemberRemove (kicks),
 *   guildMemberUpdate (role/nick changes), guildRoleCreate, guildRoleDelete,
 *   guildRoleUpdate, channelCreate, channelDelete, channelUpdate,
 *   messageCreate (staff channels), messageDeleteBulk, webhookUpdate
 *
 * This is a sanitized excerpt — IDs and credentials are removed.
 */

const { EmbedBuilder, AuditLogEvent } = require('discord.js');

// ─── Staff detection ─────────────────────────────────────────────────

function isStaff(member) {
    if (!member || member.user?.bot) return false;
    const staffIds = new Set(config.staffRoleIds || []);
    for (const role of member.roles?.cache?.values() || []) {
        if (staffIds.has(role.id)) return true;
    }
    // Fallback: check for dangerous permissions
    if (config.permissionFallback?.enabled) {
        for (const perm of config.dangerousPermissions || []) {
            if (member.permissions.has(perm)) return true;
        }
    }
    return false;
}

// ─── Audit log fetching with retry ───────────────────────────────────

async function fetchAuditEntry(guild, actionType, targetId, { withinMs = 10000 } = {}) {
    try {
        const logs = await guild.fetchAuditLogs({ type: actionType, limit: 5 });
        const now = Date.now();
        return logs.entries.find(entry => {
            if (now - entry.createdTimestamp > withinMs) return false;
            if (targetId && entry.target?.id !== targetId) return false;
            return true;
        }) || null;
    } catch {
        return null;
    }
}

// ─── Embed builder ───────────────────────────────────────────────────

function buildAuditEmbed({ title, color, actor, target, fields, timestamp }) {
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor(color)
        .setTimestamp(timestamp || new Date());

    if (actor) {
        embed.setAuthor({
            name: `${actor.user.tag} (${actor.id})`,
            iconURL: actor.user.displayAvatarURL(),
        });
    }

    if (target) {
        embed.setThumbnail(target.displayAvatarURL?.() || null);
    }

    for (const [name, value] of Object.entries(fields || {})) {
        if (value) embed.addFields({ name, value: String(value).slice(0, 1024), inline: true });
    }

    return embed;
}

// ─── Post to audit channel ───────────────────────────────────────────

async function postAudit(client, embed) {
    try {
        const logGuild = client.guilds.cache.get(process.env.STAFF_AUDIT_GUILD_ID);
        if (!logGuild) return;
        const logChannel = logGuild.channels.cache.get(process.env.STAFF_AUDIT_CHANNEL_ID);
        if (!logChannel) return;
        await logChannel.send({ embeds: [embed] });
    } catch (err) {
        console.error(`[StaffAudit] Failed to post: ${err.message}`);
    }
}

module.exports = { isStaff, fetchAuditEntry, buildAuditEmbed, postAudit };
