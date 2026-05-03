/**
 * Bot memory — schema, mutations, and RAG injection for system prompts.
 *
 * Each INFT bot has a dynamic memory blob stored encrypted on 0G Storage.
 * The blob captures stats, recent opponents, and lessons the bot has
 * "learned" from past matches. Before each inference call, the most
 * relevant slices are injected into the system prompt as plain text
 * context — RAG-style.
 *
 * No SDK calls here. Pure types + transformations. Storage I/O lives
 * in lib/0g-storage.ts; orchestration lives in server.ts.
 */

import * as crypto from 'node:crypto';

// ============ Schema ============

export const MEMORY_SCHEMA_VERSION = '1.0';

export interface MatchOutcome {
    /** Unique match ID (matches the on-chain gameId). */
    matchId: string | number;
    /** Lowercased opponent address. */
    opponent: string;
    /** Did the bot win this match? */
    botWon: boolean;
    /** Stake size in 0G (informational). */
    stake?: number;
    /** Free-text descriptor of what tactic the player used. */
    playerTactic?: string;
    /** Anything notable the bot picked up — becomes a "lesson". */
    lesson?: string;
    /** Unix ms timestamp. */
    ts: number;
}

export interface OpponentMemory {
    /** SHA-256 hash of opponent address — preserves privacy in plaintext memory. */
    playerHash: string;
    /** Number of matches the bot has played against this opponent. */
    matchCount: number;
    /** "win" or "loss" of the most recent match. */
    lastResult: 'win' | 'loss';
    /** Optional descriptor of player's last observed tactic. */
    lastTactic?: string;
    /** Unix ms timestamp of the last encounter. */
    ts: number;
}

export interface BotMemory {
    version: string;
    botId: string | number;
    stats: {
        totalMatches: number;
        wins: number;
        losses: number;
        winRate: number; // 0..1
    };
    /** Opponents the bot has played, keyed by playerHash. Capped to keep size bounded. */
    recentOpponents: Record<string, OpponentMemory>;
    /** Free-form lessons the bot has accumulated. Capped to N most recent. */
    lessonsLearned: string[];
    /** Last few one-line match summaries (for narrative continuity). */
    lastMatchSummaries: string[];
    /** Last update timestamp. */
    updatedAt: number;
}

// ============ Limits ============

export const MAX_RECENT_OPPONENTS = 50;
export const MAX_LESSONS = 30;
export const MAX_RECENT_SUMMARIES = 10;

// ============ Constructors ============

export function emptyMemory(botId: string | number): BotMemory {
    return {
        version: MEMORY_SCHEMA_VERSION,
        botId,
        stats: { totalMatches: 0, wins: 0, losses: 0, winRate: 0 },
        recentOpponents: {},
        lessonsLearned: [],
        lastMatchSummaries: [],
        updatedAt: Date.now(),
    };
}

// ============ Mutations ============

export function hashAddress(addr: string): string {
    return crypto.createHash('sha256').update(addr.toLowerCase()).digest('hex');
}

/**
 * Append a match outcome to memory. Returns a new memory object
 * (caller decides whether to persist immediately).
 */
export function appendMatch(memory: BotMemory, outcome: MatchOutcome): BotMemory {
    const totalMatches = memory.stats.totalMatches + 1;
    const wins = memory.stats.wins + (outcome.botWon ? 1 : 0);
    const losses = memory.stats.losses + (outcome.botWon ? 0 : 1);
    const winRate = totalMatches === 0 ? 0 : wins / totalMatches;

    // Update opponent record
    const playerHash = hashAddress(outcome.opponent);
    const existingOpp = memory.recentOpponents[playerHash];
    const updatedOpp: OpponentMemory = {
        playerHash,
        matchCount: (existingOpp?.matchCount ?? 0) + 1,
        lastResult: outcome.botWon ? 'win' : 'loss',
        lastTactic: outcome.playerTactic ?? existingOpp?.lastTactic,
        ts: outcome.ts,
    };
    const recentOpponents = { ...memory.recentOpponents, [playerHash]: updatedOpp };
    capOpponents(recentOpponents, MAX_RECENT_OPPONENTS);

    // Append lesson if provided
    let lessonsLearned = memory.lessonsLearned.slice();
    if (outcome.lesson && outcome.lesson.trim()) {
        lessonsLearned.unshift(outcome.lesson.trim());
        lessonsLearned = lessonsLearned.slice(0, MAX_LESSONS);
    }

    // Append summary
    const summary = buildMatchSummary(outcome);
    const lastMatchSummaries = [summary, ...memory.lastMatchSummaries].slice(0, MAX_RECENT_SUMMARIES);

    return {
        ...memory,
        stats: { totalMatches, wins, losses, winRate },
        recentOpponents,
        lessonsLearned,
        lastMatchSummaries,
        updatedAt: Date.now(),
    };
}

function capOpponents(opponents: Record<string, OpponentMemory>, max: number): void {
    const entries = Object.entries(opponents);
    if (entries.length <= max) return;
    // Drop oldest by ts
    entries.sort((a, b) => b[1].ts - a[1].ts);
    const toDrop = entries.slice(max);
    for (const [hash] of toDrop) delete opponents[hash];
}

function buildMatchSummary(outcome: MatchOutcome): string {
    const result = outcome.botWon ? 'won' : 'lost';
    const tactic = outcome.playerTactic ? ` (player used ${outcome.playerTactic})` : '';
    return `Match ${outcome.matchId}: ${result}${tactic}`;
}

// ============ RAG injection ============

export interface ContextOptions {
    /** Lowercased current opponent address. If known, that opponent's memory is highlighted. */
    currentOpponent?: string;
    /** Max number of lessons to include in the injected context. Default 5. */
    maxLessons?: number;
    /** Max number of recent summaries to include. Default 3. */
    maxSummaries?: number;
}

/**
 * Build a plain-text block to prepend to the bot's system prompt before
 * each inference call. Designed to fit into a small context window.
 *
 * Output looks roughly like:
 *
 *   [YOUR MEMORY]
 *   - You have played 847 matches (62% win rate).
 *   - This opponent has played you 3 times. Last time they used math_questions.
 *   - Recent lessons:
 *     • Players asking weather first are usually human.
 *     • Math under 5s = bot faking bot.
 *   - Recent matches:
 *     • Match 1234: won (player used emotional)
 *     • Match 1233: lost
 */
export function buildContextLines(memory: BotMemory, opts: ContextOptions = {}): string {
    const lines: string[] = ['[YOUR MEMORY]'];

    // Stats
    if (memory.stats.totalMatches > 0) {
        const pct = Math.round(memory.stats.winRate * 100);
        lines.push(`- You have played ${memory.stats.totalMatches} matches (${pct}% win rate).`);
    } else {
        lines.push('- You are new — this is your first match.');
    }

    // Opponent-specific
    if (opts.currentOpponent) {
        const hash = hashAddress(opts.currentOpponent);
        const opp = memory.recentOpponents[hash];
        if (opp) {
            const tacticPart = opp.lastTactic ? ` Last time they used ${opp.lastTactic}.` : '';
            lines.push(
                `- This opponent has played you ${opp.matchCount} time${opp.matchCount === 1 ? '' : 's'} before. Last result: ${opp.lastResult}.${tacticPart}`,
            );
        }
    }

    // Lessons
    const maxLessons = opts.maxLessons ?? 5;
    const lessons = memory.lessonsLearned.slice(0, maxLessons);
    if (lessons.length > 0) {
        lines.push('- Recent lessons:');
        lessons.forEach((l) => lines.push(`  • ${l}`));
    }

    // Recent summaries
    const maxSummaries = opts.maxSummaries ?? 3;
    const summaries = memory.lastMatchSummaries.slice(0, maxSummaries);
    if (summaries.length > 0) {
        lines.push('- Recent matches:');
        summaries.forEach((s) => lines.push(`  • ${s}`));
    }

    return lines.join('\n');
}

/**
 * Convenience: take a base persona system prompt and inject the memory
 * context as a separate block. The result is what gets passed as the
 * `system` role message to 0G Compute.
 */
export function buildSystemPromptWithMemory(
    basePersona: string,
    memory: BotMemory,
    opts: ContextOptions = {},
): string {
    const ctx = buildContextLines(memory, opts);
    return `${basePersona.trim()}\n\n${ctx}`;
}
