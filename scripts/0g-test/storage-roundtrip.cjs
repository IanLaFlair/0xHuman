/**
 * 0G Storage — Upload + Download Roundtrip Test
 *
 * Uploads a small JSON blob (mock chat transcript) to 0G Storage,
 * then downloads it back to verify integrity.
 *
 * Requires:
 * - PRIVATE_KEY in .env.local
 * - ~0.001-0.01 0G in wallet for upload gas
 *
 * Output:
 *   - rootHash from upload
 *   - downloaded blob bytes match
 *   - latency + cost metrics
 */

const { Indexer, MemData } = require('@0gfoundation/0g-storage-ts-sdk');
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    let envConfig = fs.readFileSync(envPath, 'utf8');
    if (envConfig.charCodeAt(0) === 0xFEFF) envConfig = envConfig.slice(1);
    envConfig.split('\n').forEach((line) => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim().replace(/[^\w]/g, '');
            const value = parts.slice(1).join('=').trim();
            if (!process.env[key] && value) process.env[key] = value;
        }
    });
}

const EVM_RPC = 'https://evmrpc-testnet.0g.ai';
const INDEXER_RPC = 'https://indexer-storage-testnet-turbo.0g.ai';
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!PRIVATE_KEY) {
    console.error('❌ PRIVATE_KEY not found in .env.local');
    process.exit(1);
}

async function main() {
    console.log(`\n[0G Storage] Roundtrip test\n`);

    const provider = new ethers.JsonRpcProvider(EVM_RPC);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const address = await signer.getAddress();
    console.log(`Signer:    ${address}`);

    const balanceBefore = await provider.getBalance(address);
    console.log(`Balance:   ${ethers.formatEther(balanceBefore)} 0G\n`);

    // Mock chat transcript (representative of post-match upload)
    const transcript = {
        version: '1.0',
        matchId: 'test-roundtrip-' + Date.now(),
        p1: '0xPLAYER',
        p2: '0xBOT_INFT_42',
        startedAt: new Date().toISOString(),
        durationSec: 60,
        messages: [
            { ts: 0, sender: 'p1', content: 'hey there' },
            { ts: 3, sender: 'p2', content: 'sup, how you doing' },
            { ts: 8, sender: 'p1', content: 'good, you a bot or what' },
            { ts: 12, sender: 'p2', content: 'lol nope just chillin' },
            { ts: 18, sender: 'p1', content: 'whats 47*23' },
            { ts: 25, sender: 'p2', content: 'idk why u testin me bro' },
        ],
        verdict: { p1Vote: 'BOT', p2Vote: 'HUMAN' },
    };

    const jsonStr = JSON.stringify(transcript);
    const bytes = new TextEncoder().encode(jsonStr);
    console.log(`Payload:   ${bytes.length} bytes JSON transcript\n`);

    const memData = new MemData(bytes);

    const indexer = new Indexer(INDEXER_RPC);

    // ===== UPLOAD =====
    console.log('=== UPLOAD ===');
    const tUp0 = Date.now();
    const [uploadResult, uploadErr] = await indexer.upload(memData, EVM_RPC, signer);
    const uploadMs = Date.now() - tUp0;

    if (uploadErr) {
        console.error(`❌ Upload failed (${uploadMs}ms):`, uploadErr);
        process.exit(1);
    }

    console.log(`✓ Upload OK (${uploadMs}ms)`);
    const rootHash = uploadResult.rootHash || (uploadResult.rootHashes && uploadResult.rootHashes[0]);
    const txHash = uploadResult.txHash || (uploadResult.txHashes && uploadResult.txHashes[0]);
    console.log(`  rootHash: ${rootHash}`);
    console.log(`  txHash:   ${txHash}\n`);

    const balanceMid = await provider.getBalance(address);
    const cost = balanceBefore - balanceMid;
    console.log(`Cost:      ${ethers.formatEther(cost)} 0G\n`);

    // Wait briefly for indexer to propagate
    console.log('Waiting 5s for indexer propagation...\n');
    await new Promise((r) => setTimeout(r, 5000));

    // ===== DOWNLOAD =====
    console.log('=== DOWNLOAD ===');
    const tDn0 = Date.now();
    const [blob, dlErr] = await indexer.downloadToBlob(rootHash, { proof: true });
    const dlMs = Date.now() - tDn0;

    if (dlErr) {
        console.error(`❌ Download failed (${dlMs}ms):`, dlErr);
        process.exit(1);
    }

    console.log(`✓ Download OK (${dlMs}ms)`);
    console.log(`  size: ${blob.size} bytes\n`);

    const downloadedText = await blob.text();
    const matches = downloadedText === jsonStr;
    console.log(`Integrity: ${matches ? '✓ MATCH' : '❌ MISMATCH'}\n`);

    if (!matches) {
        console.log('Original (first 200 chars):', jsonStr.slice(0, 200));
        console.log('Downloaded (first 200 chars):', downloadedText.slice(0, 200));
    }

    console.log('=== SUMMARY ===');
    console.log(`Payload size:    ${bytes.length} bytes`);
    console.log(`Upload latency:  ${uploadMs}ms`);
    console.log(`Upload cost:     ${ethers.formatEther(cost)} 0G`);
    console.log(`Download latency:${dlMs}ms`);
    console.log(`Integrity:       ${matches ? 'OK' : 'FAILED'}`);
    console.log(`Root hash:       ${rootHash}`);
    console.log(`Tx hash:         ${txHash}`);
    console.log(`Explorer:        https://chainscan-galileo.0g.ai/tx/${txHash}\n`);
}

main().catch((e) => {
    console.error('\n❌ ERROR:', e);
    process.exit(1);
});
