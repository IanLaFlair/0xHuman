/**
 * Internal helper for launch-mainnet.cjs.
 *
 * Encrypts a persona JSON file with the supplied AES-256 key and uploads
 * the ciphertext to 0G Storage. Prints a single JSON line to stdout with
 * the storage rootHash, txHash, and size, so the hardhat-based parent
 * script can parse it and feed personalityURI into BotINFT.mintFreeSlot().
 *
 * Spawned from launch-mainnet.cjs — not meant to be called directly.
 *
 * Usage:
 *   STORAGE_PRIVATE_KEY=0x... npx tsx scripts/internal/upload-persona-helper.ts \
 *     --persona <path-to-json> --key <64-hex> --network testnet|mainnet
 */

import 'dotenv/config';
import { config as dotenvConfig } from 'dotenv';
import * as fs from 'node:fs';
import {
    uploadEncrypted,
    configFromPrivateKey,
    type StorageConfig,
} from '../../lib/0g-storage.ts';

dotenvConfig({ path: '.env.local' });

function arg(name: string): string {
    const idx = process.argv.indexOf(`--${name}`);
    if (idx < 0 || idx + 1 >= process.argv.length) {
        throw new Error(`missing --${name}`);
    }
    return process.argv[idx + 1];
}

async function main() {
    const personaPath = arg('persona');
    const keyHex = arg('key');
    const network = arg('network') as 'testnet' | 'mainnet';

    const pk = process.env.STORAGE_PRIVATE_KEY;
    if (!pk) throw new Error('STORAGE_PRIVATE_KEY env required');

    const personaJson = fs.readFileSync(personaPath, 'utf8');
    const persona = JSON.parse(personaJson);
    const symmetricKey = Buffer.from(keyHex, 'hex');
    if (symmetricKey.length !== 32) throw new Error('key must be 32 bytes hex');

    let cfg: StorageConfig = configFromPrivateKey(pk, network);

    // Allow indexer override (mainnet URL not yet verified in the SDK defaults).
    const indexerOverride = process.env.STORAGE_INDEXER_MAINNET;
    if (network === 'mainnet' && indexerOverride) {
        cfg = { ...cfg, indexerRpc: indexerOverride };
    }

    console.error(`[upload-helper] network=${network} indexer=${cfg.indexerRpc}`);
    console.error(`[upload-helper] persona=${persona.name}`);

    const result = await uploadEncrypted(cfg, persona, symmetricKey);

    // stdout — single JSON line for the parent process to parse.
    process.stdout.write(
        JSON.stringify({
            rootHash: result.rootHash,
            txHash: result.txHash,
            sizeBytes: result.sizeBytes,
            latencyMs: result.latencyMs,
            network,
            indexer: cfg.indexerRpc,
        }) + '\n',
    );
}

main().catch((e) => {
    console.error('[upload-helper] error:', e);
    process.exit(1);
});
