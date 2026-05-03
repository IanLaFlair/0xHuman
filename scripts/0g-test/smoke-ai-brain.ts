/**
 * Smoke test for scripts/ai-brain.ts.
 *
 * Verifies persona loading, session creation, reply generation (with
 * automatic fallback to mock when ledger is empty), and history tracking.
 */

import 'dotenv/config';
import { config as dotenvConfig } from 'dotenv';
import {
    createBotSession,
    listAvailablePersonas,
    loadPersona,
} from '../ai-brain.ts';

dotenvConfig({ path: '.env.local' });

async function main() {
    console.log('\n[Smoke] ai-brain.ts\n');

    console.log('=== TEST 1: persona discovery ===');
    const personas = listAvailablePersonas();
    console.log(`Available personas: ${personas.join(', ')}`);
    if (personas.length === 0) {
        console.error('❌ no personas in data/personas/');
        process.exit(1);
    }
    console.log('✓ PASS\n');

    console.log('=== TEST 2: persona load ===');
    const mochi = loadPersona('mochi');
    console.log(`Loaded: ${mochi.name} — ${mochi.tagline}`);
    console.log('✓ PASS\n');

    console.log('=== TEST 3: session reply (auto-fallback to mock if needed) ===');
    const session = createBotSession({
        personaSlug: 'mochi',
        opponent: '0xPLAYER1',
    });

    const r1 = await session.reply('sup');
    console.log(`R1: "${r1.text}"  (mocked=${r1.mocked}, verified=${r1.verified}, ${r1.latencyMs}ms)`);

    const r2 = await session.reply('u a bot?');
    console.log(`R2: "${r2.text}"  (mocked=${r2.mocked}, verified=${r2.verified}, ${r2.latencyMs}ms)`);

    const r3 = await session.reply('whats 47*23');
    console.log(`R3: "${r3.text}"  (mocked=${r3.mocked}, verified=${r3.verified}, ${r3.latencyMs}ms)`);
    console.log('✓ PASS\n');

    console.log('=== TEST 4: history tracking ===');
    const history = session.getHistory();
    console.log(`History length: ${history.length} turns (expect 6 = 3 user + 3 assistant)`);
    if (history.length !== 6) {
        console.error('❌ FAIL: unexpected history length');
        process.exit(1);
    }
    console.log('✓ PASS\n');

    console.log('=== TEST 5: different persona ===');
    const skibidi = createBotSession({
        personaSlug: 'skibidi',
        opponent: '0xPLAYER2',
    });
    const sk1 = await skibidi.reply('whats good');
    console.log(`Skibidi R1: "${sk1.text}"  (mocked=${sk1.mocked})`);
    console.log('✓ PASS\n');

    console.log('=== SUMMARY ===');
    console.log(`Personas available:    ${personas.length}`);
    console.log(`Mochi session works:   ✓`);
    console.log(`Skibidi session works: ✓`);
    console.log(`History tracking:      ✓`);
    console.log(`Mock fallback works:   ${r1.mocked ? '✓' : '⚠️ unexpected — ledger may be funded'}`);
}

main().catch((e) => {
    console.error('\n❌ ERROR:', e);
    process.exit(1);
});
