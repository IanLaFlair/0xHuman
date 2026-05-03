/**
 * Smoke test for lib/0g-compute.ts wrapper.
 *
 * Tests:
 * 1. listProviders (read-only, free)
 * 2. infer() in mockMode (no network required)
 * 3. infer() in real mode — expected to fall back to mock since
 *    wallet doesn't have ledger bootstrapped (verifies graceful fallback)
 */

import 'dotenv/config';
import { config as dotenvConfig } from 'dotenv';
import {
    listProviders,
    infer,
    configFromPrivateKey,
    DEFAULT_TESTNET_CONFIG,
    type ChatMessage,
} from '../../lib/0g-compute.ts';

dotenvConfig({ path: '.env.local' });

const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
    console.error('❌ PRIVATE_KEY not in .env.local');
    process.exit(1);
}

async function main() {
    console.log('\n[Smoke] lib/0g-compute.ts wrapper test\n');

    // ===== Test 1: listProviders =====
    console.log('=== TEST 1: listProviders ===');
    const providers = await listProviders(DEFAULT_TESTNET_CONFIG.rpcUrl);
    console.log(`✓ Found ${providers.length} providers`);
    providers.forEach((p, i) => console.log(`  [${i + 1}] ${p.model} @ ${p.provider}`));
    console.log('');

    // ===== Test 2: mockMode =====
    console.log('=== TEST 2: infer() with mockMode=true ===');
    const mockCfg = configFromPrivateKey(PRIVATE_KEY!, 'testnet', { mockMode: true });
    const mockMessages: ChatMessage[] = [
        { role: 'system', content: 'You are Mochi, a chill gen-z cat lover.' },
        { role: 'user', content: 'sup whats good' },
    ];
    const mockResult = await infer(mockCfg, mockMessages);
    console.log(`✓ Reply: "${mockResult.reply}"`);
    console.log(`  Mocked: ${mockResult.mocked}`);
    console.log(`  Latency: ${mockResult.latencyMs}ms`);
    console.log(`  ChatID: ${mockResult.chatId}`);
    console.log('');

    // Determinism check — same input → same reply
    const mockResult2 = await infer(mockCfg, mockMessages);
    const deterministic = mockResult.reply === mockResult2.reply;
    console.log(`  Determinism: ${deterministic ? '✓' : '⚠️  varies'}\n`);

    // ===== Test 3: real mode fallback =====
    console.log('=== TEST 3: infer() with real mode (expect fallback to mock) ===');
    console.log('  (wallet lacks 3 0G ledger bootstrap → should auto-fallback)');
    const realCfg = configFromPrivateKey(PRIVATE_KEY!, 'testnet');
    const realResult = await infer(realCfg, mockMessages);
    console.log(`✓ Reply: "${realResult.reply}"`);
    console.log(`  Mocked: ${realResult.mocked} (true means fallback worked)`);
    console.log(`  Verified: ${realResult.verified}\n`);

    console.log('=== SUMMARY ===');
    console.log(`Provider catalog:        ${providers.length} found`);
    console.log(`Mock inference:          ${mockResult.mocked ? '✓ PASS' : '❌ FAIL'}`);
    console.log(`Real-mode fallback:      ${realResult.mocked ? '✓ PASS' : '⚠️  unexpected — ledger may already exist'}`);
}

main().catch((e) => {
    console.error('\n❌ ERROR:', e);
    process.exit(1);
});
