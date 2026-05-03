/**
 * Smoke test for lib/bot-memory.ts.
 *
 * Pure-logic tests — no network, no SDK calls. Validates schema mutations,
 * caps, hash determinism, and RAG context construction.
 */

import {
    emptyMemory,
    appendMatch,
    buildContextLines,
    buildSystemPromptWithMemory,
    hashAddress,
    MAX_RECENT_OPPONENTS,
    MAX_LESSONS,
    type MatchOutcome,
} from '../../lib/bot-memory.ts';

function assert(cond: unknown, msg: string): void {
    if (!cond) {
        console.error(`❌ ASSERT FAIL: ${msg}`);
        process.exit(1);
    }
}

console.log('\n[Smoke] lib/bot-memory.ts\n');

// ===== Test 1: empty memory =====
console.log('=== TEST 1: emptyMemory ===');
const m0 = emptyMemory(42);
assert(m0.botId === 42, 'botId set');
assert(m0.stats.totalMatches === 0, 'starts at 0 matches');
assert(Object.keys(m0.recentOpponents).length === 0, 'no opponents');
console.log('✓ PASS\n');

// ===== Test 2: hashAddress determinism =====
console.log('=== TEST 2: hashAddress determinism ===');
const h1 = hashAddress('0xABC123');
const h2 = hashAddress('0xabc123');
const h3 = hashAddress('0xDEF456');
assert(h1 === h2, 'case-insensitive');
assert(h1 !== h3, 'different addresses → different hashes');
assert(h1.length === 64, 'sha256 is 64 hex chars');
console.log('✓ PASS\n');

// ===== Test 3: appendMatch updates stats =====
console.log('=== TEST 3: appendMatch updates stats ===');
let m = emptyMemory(42);
const outcome1: MatchOutcome = {
    matchId: 1001,
    opponent: '0xPLAYER1',
    botWon: true,
    playerTactic: 'math_questions',
    lesson: 'Players asking math first often try to bait',
    ts: Date.now(),
};
m = appendMatch(m, outcome1);
assert(m.stats.totalMatches === 1, '1 match');
assert(m.stats.wins === 1, '1 win');
assert(m.stats.winRate === 1, 'win rate 1');
assert(m.lessonsLearned.length === 1, '1 lesson');
assert(m.lastMatchSummaries[0].includes('won'), 'summary contains won');

const outcome2: MatchOutcome = {
    matchId: 1002,
    opponent: '0xPLAYER1', // same player again
    botWon: false,
    ts: Date.now(),
};
m = appendMatch(m, outcome2);
assert(m.stats.totalMatches === 2, '2 matches');
assert(m.stats.wins === 1, 'still 1 win');
assert(m.stats.losses === 1, '1 loss');
assert(m.stats.winRate === 0.5, 'win rate 0.5');
const oppHash = hashAddress('0xPLAYER1');
assert(m.recentOpponents[oppHash].matchCount === 2, 'opponent counted twice');
assert(m.recentOpponents[oppHash].lastResult === 'loss', 'last result loss');
console.log('✓ PASS\n');

// ===== Test 4: lesson cap =====
console.log('=== TEST 4: lesson cap ===');
let mCap = emptyMemory(99);
for (let i = 0; i < MAX_LESSONS + 10; i++) {
    mCap = appendMatch(mCap, {
        matchId: i,
        opponent: '0xPLAYER',
        botWon: true,
        lesson: `lesson #${i}`,
        ts: Date.now() + i,
    });
}
assert(mCap.lessonsLearned.length === MAX_LESSONS, `lessons capped at ${MAX_LESSONS}`);
// Most recent first
assert(mCap.lessonsLearned[0].includes(`#${MAX_LESSONS + 9}`), 'most recent at front');
console.log('✓ PASS\n');

// ===== Test 5: opponent cap =====
console.log('=== TEST 5: opponent cap ===');
let mOpp = emptyMemory(100);
for (let i = 0; i < MAX_RECENT_OPPONENTS + 10; i++) {
    mOpp = appendMatch(mOpp, {
        matchId: i,
        opponent: `0xPLAYER${i}`,
        botWon: true,
        ts: Date.now() + i,
    });
}
assert(
    Object.keys(mOpp.recentOpponents).length === MAX_RECENT_OPPONENTS,
    `opponents capped at ${MAX_RECENT_OPPONENTS}`,
);
console.log('✓ PASS\n');

// ===== Test 6: context lines build =====
console.log('=== TEST 6: buildContextLines ===');
const ctx = buildContextLines(m, { currentOpponent: '0xPLAYER1', maxLessons: 3 });
console.log('Output:');
console.log(ctx.split('\n').map((l) => '  ' + l).join('\n'));
assert(ctx.includes('YOUR MEMORY'), 'has header');
assert(ctx.includes('played 2 matches'), 'has match count');
assert(ctx.includes('played you 2 times'), 'has opponent context');
console.log('✓ PASS\n');

// ===== Test 7: full system prompt =====
console.log('=== TEST 7: buildSystemPromptWithMemory ===');
const sysPrompt = buildSystemPromptWithMemory(
    'You are Mochi, a chill gen-z cat lover.',
    m,
    { currentOpponent: '0xPLAYER1' },
);
console.log('Output:');
console.log(sysPrompt.split('\n').map((l) => '  ' + l).join('\n'));
assert(sysPrompt.startsWith('You are Mochi'), 'starts with persona');
assert(sysPrompt.includes('YOUR MEMORY'), 'memory block included');
console.log('✓ PASS\n');

console.log('=== ALL TESTS PASSED ===\n');
