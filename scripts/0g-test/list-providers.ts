/**
 * 0G Compute Network — Provider Catalog Query
 *
 * Read-only call to list available inference providers and their models.
 * No wallet, no balance required. Safe to run repeatedly.
 *
 * Output: prints provider table + writes JSON snapshot for reference.
 */

import { createZGComputeNetworkReadOnlyBroker } from '@0gfoundation/0g-compute-ts-sdk';
import * as fs from 'fs';
import * as path from 'path';

const RPC_URL = 'https://evmrpc-testnet.0g.ai';

async function main() {
    console.log(`\n[0G Compute] Querying providers via ${RPC_URL}\n`);

    const t0 = Date.now();
    const broker = await createZGComputeNetworkReadOnlyBroker(RPC_URL);
    const initMs = Date.now() - t0;
    console.log(`✓ Broker initialized (${initMs}ms)\n`);

    const t1 = Date.now();
    const services = await broker.inference.listService();
    const listMs = Date.now() - t1;
    console.log(`✓ listService() returned ${services.length} entries (${listMs}ms)\n`);

    if (services.length === 0) {
        console.log('⚠️  No providers found. Possibly testnet has no active providers, or RPC issue.');
        return;
    }

    console.log('=== PROVIDER CATALOG ===\n');
    services.forEach((svc: any, i: number) => {
        console.log(`[${i + 1}] Provider: ${svc.provider}`);
        console.log(`    Model:    ${svc.model || '(unspecified)'}`);
        console.log(`    Service:  ${svc.serviceType || '(unspecified)'}`);
        console.log(`    URL:      ${svc.url || '(unspecified)'}`);
        if (svc.inputPrice !== undefined) console.log(`    Input:    ${svc.inputPrice}`);
        if (svc.outputPrice !== undefined) console.log(`    Output:   ${svc.outputPrice}`);
        console.log('');
    });

    // Try detailed view too
    try {
        const t2 = Date.now();
        const detailed = await broker.inference.listServiceWithDetail();
        const detailMs = Date.now() - t2;
        console.log(`✓ listServiceWithDetail() returned ${detailed.length} entries (${detailMs}ms)\n`);

        // Save snapshot
        const outPath = path.resolve(process.cwd(), 'scripts/0g-test/_snapshot-providers.json');
        fs.writeFileSync(outPath, JSON.stringify(
            detailed.map((s: any) => ({ ...s })),
            (_, v) => typeof v === 'bigint' ? v.toString() : v,
            2
        ));
        console.log(`✓ Snapshot written: ${outPath}\n`);
    } catch (e) {
        console.log(`⚠️  listServiceWithDetail() failed: ${(e as Error).message}\n`);
    }

    console.log('=== SUMMARY ===');
    console.log(`Providers found: ${services.length}`);
    console.log(`Init latency:    ${initMs}ms`);
    console.log(`List latency:    ${listMs}ms`);
    console.log('\nNext step: pick provider/model for production use, document in 0G-INTEGRATION-NOTES.md');
}

main().catch((e) => {
    console.error('\n❌ ERROR:', e);
    process.exit(1);
});
