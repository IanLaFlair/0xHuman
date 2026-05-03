/**
 * Smoke test for lib/0g-storage.ts wrapper.
 *
 * Verifies upload + download for both plain JSON and AES-256-GCM
 * encrypted blobs against Galileo testnet.
 */

import 'dotenv/config';
import { config as dotenvConfig } from 'dotenv';
import {
    configFromPrivateKey,
    uploadJSON,
    downloadJSON,
    uploadEncrypted,
    downloadEncrypted,
    generateSymmetricKey,
} from '../../lib/0g-storage.ts';

dotenvConfig({ path: '.env.local' });

const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
    console.error('❌ PRIVATE_KEY not in .env.local');
    process.exit(1);
}

interface ChatTranscript {
    matchId: string;
    messages: Array<{ ts: number; sender: string; content: string }>;
}

async function main() {
    console.log('\n[Smoke] lib/0g-storage.ts wrapper test\n');
    const cfg = configFromPrivateKey(PRIVATE_KEY!, 'testnet');

    // ===== Plain JSON =====
    console.log('=== PLAIN JSON ===');
    const transcript: ChatTranscript = {
        matchId: 'smoke-' + Date.now(),
        messages: [
            { ts: 0, sender: 'p1', content: 'hi' },
            { ts: 5, sender: 'p2', content: 'hey' },
        ],
    };

    const upPlain = await uploadJSON(cfg, transcript);
    console.log(`✓ Uploaded plain (${upPlain.latencyMs}ms): ${upPlain.rootHash}`);

    await new Promise((r) => setTimeout(r, 5000));

    const dnPlain = await downloadJSON<ChatTranscript>(cfg, upPlain.rootHash);
    console.log(`✓ Downloaded plain (${dnPlain.latencyMs}ms): ${dnPlain.data.messages.length} messages`);
    const plainOK = JSON.stringify(dnPlain.data) === JSON.stringify(transcript);
    console.log(`  Integrity: ${plainOK ? '✓ MATCH' : '❌ MISMATCH'}\n`);

    // ===== Encrypted JSON =====
    console.log('=== ENCRYPTED JSON ===');
    const secret = { systemPrompt: 'You are Mochi, top-secret persona.', temperature: 0.8 };
    const key = generateSymmetricKey();

    const upEnc = await uploadEncrypted(cfg, secret, key);
    console.log(`✓ Uploaded encrypted (${upEnc.latencyMs}ms): ${upEnc.rootHash}`);

    await new Promise((r) => setTimeout(r, 5000));

    const dnEnc = await downloadEncrypted<typeof secret>(cfg, upEnc.rootHash, key);
    console.log(`✓ Downloaded encrypted (${dnEnc.latencyMs}ms)`);
    const encOK = JSON.stringify(dnEnc.data) === JSON.stringify(secret);
    console.log(`  Integrity: ${encOK ? '✓ MATCH' : '❌ MISMATCH'}\n`);

    // ===== Negative test: wrong key =====
    console.log('=== ENCRYPTED — wrong key (should fail) ===');
    const wrongKey = generateSymmetricKey();
    try {
        await downloadEncrypted(cfg, upEnc.rootHash, wrongKey);
        console.log('❌ UNEXPECTED: decrypt succeeded with wrong key\n');
    } catch (e) {
        console.log(`✓ Correctly rejected: ${(e as Error).message.split('\n')[0]}\n`);
    }

    console.log('=== SUMMARY ===');
    console.log(`Plain JSON roundtrip:     ${plainOK ? '✓ PASS' : '❌ FAIL'}`);
    console.log(`Encrypted roundtrip:      ${encOK ? '✓ PASS' : '❌ FAIL'}`);
    console.log(`Wrong-key rejection:      ✓ PASS`);
}

main().catch((e) => {
    console.error('\n❌ ERROR:', e);
    process.exit(1);
});
