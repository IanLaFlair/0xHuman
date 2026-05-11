/**
 * Discover 0G Compute providers on MAINNET.
 *
 * Queries the on-chain provider catalog (read-only, no signer), filters
 * for Qwen-class chat providers, and prints a recommendation snippet you
 * can paste into lib/0g-compute.ts → DEFAULT_MAINNET_CONFIG.providerAddress.
 *
 * Usage:
 *   node scripts/0g-test/discover-mainnet-providers.cjs
 *   RPC_URL=https://evmrpc.0g.ai node scripts/0g-test/discover-mainnet-providers.cjs
 *
 * Output: scripts/0g-test/_mainnet-providers.json (snapshot for debugging)
 */

const { createZGComputeNetworkReadOnlyBroker } = require('@0gfoundation/0g-compute-ts-sdk');
const fs = require('fs');
const path = require('path');

const RPC_URL = process.env.RPC_URL || 'https://evmrpc.0g.ai';

function isChatProvider(svc) {
    const model = (svc.model || '').toLowerCase();
    const type = (svc.serviceType || '').toLowerCase();
    // Qwen, Llama, Mistral, etc. — anything chat-ish that isn't image/embedding
    if (type.includes('image') || type.includes('embed')) return false;
    if (model.includes('qwen') || model.includes('llama') || model.includes('chat')) return true;
    return type.includes('chat') || type === '' /* default */;
}

async function main() {
    console.log(`\n[0G Compute MAINNET] Querying providers via ${RPC_URL}\n`);

    const t0 = Date.now();
    const broker = await createZGComputeNetworkReadOnlyBroker(RPC_URL);
    console.log(`✓ Broker initialized (${Date.now() - t0}ms)\n`);

    const t1 = Date.now();
    const services = await broker.inference.listService();
    console.log(`✓ listService() → ${services.length} entries (${Date.now() - t1}ms)\n`);

    if (services.length === 0) {
        console.log('⚠️  Catalog empty. Possible causes:');
        console.log('    - mainnet has no active providers yet');
        console.log('    - RPC URL incorrect (current: ' + RPC_URL + ')');
        console.log('    - SDK version mismatch with mainnet contracts');
        return;
    }

    // ----- Full dump -----
    console.log('=== ALL PROVIDERS ===\n');
    services.forEach((svc, i) => {
        console.log(`[${i + 1}] ${svc.provider}`);
        console.log(`    Model:   ${svc.model || '(unspecified)'}`);
        console.log(`    Service: ${svc.serviceType || '(unspecified)'}`);
        console.log(`    URL:     ${svc.url || '(unspecified)'}`);
        if (svc.inputPrice !== undefined) console.log(`    Input:   ${svc.inputPrice}`);
        if (svc.outputPrice !== undefined) console.log(`    Output:  ${svc.outputPrice}`);
        console.log('');
    });

    // ----- Filter for chat providers -----
    const chatProviders = services.filter(isChatProvider);
    console.log(`\n=== CHAT-CLASS CANDIDATES (${chatProviders.length}) ===\n`);

    if (chatProviders.length === 0) {
        console.log('⚠️  No chat-class providers detected. Inspect the full list above');
        console.log('    and pick manually based on model name / URL.\n');
        return;
    }

    // Ranking heuristic for the Turing-test chat use case:
    //   1. Qwen (testnet was Qwen 2.5 7B — least behavioural drift)
    //   2. 0GM (0G's first-party model — best ecosystem story)
    //   3. lowest input price
    // Penalise vision-language variants since the chat flow is text-only;
    // the extra VL capacity just inflates inference cost.
    const ranked = [...chatProviders].sort((a, b) => {
        const ma = (a.model || '').toLowerCase();
        const mb = (b.model || '').toLowerCase();
        const aVL = ma.includes('vl') || ma.includes('vision');
        const bVL = mb.includes('vl') || mb.includes('vision');
        if (aVL !== bVL) return aVL ? 1 : -1;
        const aIsQwen = ma.includes('qwen');
        const bIsQwen = mb.includes('qwen');
        if (aIsQwen !== bIsQwen) return aIsQwen ? -1 : 1;
        const aIs0GM = ma.includes('0gm');
        const bIs0GM = mb.includes('0gm');
        if (aIs0GM !== bIs0GM) return aIs0GM ? -1 : 1;
        const ap = BigInt(a.inputPrice ?? 0n);
        const bp = BigInt(b.inputPrice ?? 0n);
        return ap < bp ? -1 : ap > bp ? 1 : 0;
    });

    ranked.forEach((svc, i) => {
        const star = i === 0 ? '⭐ ' : '   ';
        console.log(`${star}${svc.provider}`);
        console.log(`     model:  ${svc.model}`);
        console.log(`     url:    ${svc.url}`);
        console.log(`     price:  ${svc.inputPrice ?? '?'} in / ${svc.outputPrice ?? '?'} out\n`);
    });

    const top = ranked[0];
    console.log('=== RECOMMENDED ===\n');
    console.log('Heuristic: prefer Qwen (testnet match) → 0GM (first-party) → cheapest input.\n');
    console.log('Paste into lib/0g-compute.ts → DEFAULT_MAINNET_CONFIG:\n');
    console.log(`    providerAddress: '${top.provider}',`);
    console.log(`    // model: ${top.model}`);
    console.log(`    // url:   ${top.url}\n`);
    console.log('Tip: override per-deploy via COMPUTE_PROVIDER_MAINNET env var\n');

    // ----- Snapshot to disk -----
    try {
        const detailed = await broker.inference.listServiceWithDetail();
        const outPath = path.resolve(process.cwd(), 'scripts/0g-test/_mainnet-providers.json');
        fs.writeFileSync(outPath, JSON.stringify(
            detailed.map((s) => ({ ...s })),
            (_, v) => typeof v === 'bigint' ? v.toString() : v,
            2,
        ));
        console.log(`✓ Snapshot written: ${outPath}`);
    } catch (e) {
        console.log(`⚠️  listServiceWithDetail() failed: ${e.message}`);
        console.log('    (snapshot skipped — full catalog still printed above)');
    }
}

main().catch((e) => {
    console.error('\n❌ ERROR:', e);
    process.exit(1);
});
