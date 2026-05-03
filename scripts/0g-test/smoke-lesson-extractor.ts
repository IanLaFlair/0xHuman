/**
 * Smoke test for lib/lesson-extractor.ts using the actual transcript from
 * the user's first match (downloaded from storagescan-galileo).
 */

import 'dotenv/config';
import { config as dotenvConfig } from 'dotenv';
import { configFromPrivateKey } from '../../lib/0g-compute.ts';
import { extractLesson, type MatchTranscriptEntry } from '../../lib/lesson-extractor.ts';

dotenvConfig({ path: '.env.local' });

const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
    console.error('❌ PRIVATE_KEY missing in .env.local');
    process.exit(1);
}

// Real transcript from match #1 (downloaded by user from 0G Storage Scan)
const transcript: MatchTranscriptEntry[] = [
    { ts: 1777811874224, sender: 'p1', text: 'Hhuhu' },
    { ts: 1777811881220, sender: 'p2', text: 'hey there :3' },
    { ts: 1777811885509, sender: 'p2', text: "hey, how's ur day going? lowkey feeling mango vibes 🐱" },
    { ts: 1777811891914, sender: 'p1', text: 'hahah i know you are bot' },
    { ts: 1777811899288, sender: 'p2', text: 'bruh, im literally just chillin, whats with the interrogation?' },
    { ts: 1777811907059, sender: 'p1', text: '1 + 1' },
    { ts: 1777811912644, sender: 'p1', text: 'ur typing so fast ' },
    { ts: 1777811914383, sender: 'p2', text: '2? idk man im not a calculator' },
    { ts: 1777811915158, sender: 'p1', text: 'i know u are bot' },
    { ts: 1777811919374, sender: 'p2', text: 'thx lol i jus wanna save trees & time 🍄' },
    { ts: 1777811921624, sender: 'p2', text: "ngl i lowkey don't care bruh" },
];

async function main() {
    console.log('\n[Smoke] lib/lesson-extractor.ts\n');
    const cfg = configFromPrivateKey(PRIVATE_KEY!, 'testnet');
    console.log(`Transcript has ${transcript.length} messages\n`);

    const t0 = Date.now();
    const lesson = await extractLesson(cfg, transcript, {
        botPersonaName: 'Mochi',
        botWon: false,
    });
    const ms = Date.now() - t0;

    if (!lesson) {
        console.error('❌ Extraction returned null — check Qwen call or mock fallback');
        process.exit(1);
    }

    console.log(`✓ Lesson extracted (${ms}ms):\n`);
    console.log(`  "${lesson}"\n`);
    console.log(`Length: ${lesson.length} chars`);
}

main().catch((e) => {
    console.error('\n❌ ERROR:', e);
    process.exit(1);
});
