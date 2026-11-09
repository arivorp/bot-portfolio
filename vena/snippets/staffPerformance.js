/**
 * Staff Performance Tracking System
 *
 * Tracks moderation actions, peer votes, and chat activity to produce
 * a weighted score per staff member. Scores drive automated promotions,
 * demotions, and monthly staff-of-the-month awards.
 *
 * This is a sanitized excerpt — IDs and credentials are removed.
 */

const db = require('../data/database');

// ─── Scoring weights ───
const SCORES = {
    mod_action: 3,             // ban, mute, warn, kick
    mod_action_with_reason: 2, // bonus for providing a good reason
    mod_undo_action: 1,        // unmute, unwarn, unban (still counts as activity)
    ticket_claim: 4,
    ticket_close: 3,
    message_staff: 0.1,        // message in staff channels (capped per day)
    message_general: 0.05,     // message in any channel (capped per day)
    vote_positive: 2,          // peer upvote on their mod log
    vote_negative: -3,         // peer downvote on their mod log
    reason_good: 2,            // reason > 10 chars, descriptive
    reason_poor: -1,           // "No reason given" or < 5 chars
};

const DAILY_MSG_CAP_STAFF = 50;
const DAILY_MSG_CAP_GENERAL = 100;

// ─── Promotion/demotion thresholds (rolling 30 days) ───
const PROMOTE_THRESHOLD = 150;
const DEMOTE_THRESHOLD = 20;
const MIN_DAYS_IN_ROLE = 14;

// ─── Schema ───
db.exec(`
    CREATE TABLE IF NOT EXISTS staff_actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        action_type TEXT NOT NULL,
        target_id TEXT,
        reason TEXT,
        points REAL NOT NULL DEFAULT 0,
        log_message_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS staff_votes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        log_message_id TEXT NOT NULL,
        staff_user_id TEXT NOT NULL,
        voter_id TEXT NOT NULL,
        vote TEXT NOT NULL CHECK(vote IN ('positive', 'negative')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(log_message_id, voter_id)
    );

    CREATE TABLE IF NOT EXISTS staff_daily_messages (
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        staff_count INTEGER DEFAULT 0,
        general_count INTEGER DEFAULT 0,
        PRIMARY KEY (guild_id, user_id, date)
    );

    CREATE TABLE IF NOT EXISTS staff_role_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        old_role TEXT,
        new_role TEXT,
        reason TEXT,
        changed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS staff_of_month (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        month TEXT NOT NULL,
        score REAL NOT NULL,
        announced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(guild_id, month)
    );
`);

/**
 * Record a moderation action and compute its score.
 * Called from audit event listeners whenever a staff member
 * performs a ban, kick, timeout, message delete, etc.
 */
function recordAction(guildId, userId, actionType, targetId, reason, logMessageId) {
    let points = 0;

    if (['ban', 'kick', 'timeout', 'warn', 'mute'].includes(actionType)) {
        points += SCORES.mod_action;
        if (reason && reason.length > 10 && reason !== 'No reason provided') {
            points += SCORES.reason_good;
        } else {
            points += SCORES.reason_poor;
        }
    } else if (['unban', 'untimeout', 'unwarn', 'unmute'].includes(actionType)) {
        points += SCORES.mod_undo_action;
    } else if (actionType === 'ticket_claim') {
        points += SCORES.ticket_claim;
    } else if (actionType === 'ticket_close') {
        points += SCORES.ticket_close;
    }

    insertAction.run(guildId, userId, actionType, targetId, reason, points, logMessageId);
    return points;
}

/**
 * Get aggregate staff scores for a rolling window.
 * Used by /staffstats and the auto-promote/demote system.
 */
function getStaffLeaderboard(guildId, days = 30) {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();

    const actionScores = db.prepare(`
        SELECT user_id, SUM(points) as action_score, COUNT(*) as action_count
        FROM staff_actions
        WHERE guild_id = ? AND created_at >= ?
        GROUP BY user_id
    `).all(guildId, cutoff);

    const voteScores = db.prepare(`
        SELECT staff_user_id as user_id,
               SUM(CASE WHEN vote = 'positive' THEN ? ELSE ? END) as vote_score
        FROM staff_votes
        WHERE guild_id = ? AND created_at >= ?
        GROUP BY staff_user_id
    `).all(SCORES.vote_positive, SCORES.vote_negative, guildId, cutoff);

    const msgScores = db.prepare(`
        SELECT user_id,
               SUM(MIN(staff_count, ?) * ? + MIN(general_count, ?) * ?) as msg_score
        FROM staff_daily_messages
        WHERE guild_id = ? AND date >= ?
        GROUP BY user_id
    `).all(DAILY_MSG_CAP_STAFF, SCORES.message_staff,
           DAILY_MSG_CAP_GENERAL, SCORES.message_general,
           guildId, cutoff.slice(0, 10));

    // Merge all score sources
    const merged = new Map();
    for (const row of actionScores) {
        merged.set(row.user_id, {
            user_id: row.user_id,
            action_score: row.action_score,
            action_count: row.action_count,
            vote_score: 0,
            msg_score: 0,
        });
    }
    for (const row of voteScores) {
        const entry = merged.get(row.user_id) || { user_id: row.user_id, action_score: 0, action_count: 0, vote_score: 0, msg_score: 0 };
        entry.vote_score = row.vote_score;
        merged.set(row.user_id, entry);
    }
    for (const row of msgScores) {
        const entry = merged.get(row.user_id) || { user_id: row.user_id, action_score: 0, action_count: 0, vote_score: 0, msg_score: 0 };
        entry.msg_score = row.msg_score;
        merged.set(row.user_id, entry);
    }

    return [...merged.values()]
        .map(e => ({ ...e, total: e.action_score + e.vote_score + e.msg_score }))
        .sort((a, b) => b.total - a.total);
}

/**
 * Auto-promote or demote staff based on their rolling 30-day score.
 * Called on a daily interval from ready.js.
 */
async function processAutoRoles(guild) {
    const scores = getStaffLeaderboard(guild.id, 30);
    // ... promotes staff above PROMOTE_THRESHOLD, demotes below DEMOTE_THRESHOLD
    // Respects MIN_DAYS_IN_ROLE to prevent role churn
}

/**
 * Staff of the Month — runs on the 1st of each month.
 * Picks the highest scorer from the previous month and announces in staff chat.
 */
async function processStaffOfMonth(guild) {
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthKey = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
    // ... checks if already announced, picks winner, posts embed
}

module.exports = {
    recordAction,
    getStaffLeaderboard,
    processAutoRoles,
    processStaffOfMonth,
    SCORES,
};
