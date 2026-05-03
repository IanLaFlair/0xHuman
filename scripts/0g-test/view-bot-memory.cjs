/**
 * View a bot's current memory state.
 *
 * Reads memoryURI from BotINFT, downloads the encrypted blob from 0G Storage,
 * decrypts with PERSONA_KEY, and prints the resulting BotMemory.
 *
 * Usage:
 *   TOKEN_ID=1 node scripts/0g-test/view-bot-memory.cjs
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { ethers } = require('ethers');
const { Indexer } = require('@0gfoundation/0g-storage-ts-sdk');

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

const TOKEN_ID = process.env.TOKEN_ID || '1';
const RPC_URL = 'https://evmrpc-testnet.0g.ai';
const INDEXER = 'https://indexer-storage-testnet-turbo.0g.ai';
const PERSONA_KEY = process.env.PERSONA_KEY;

const deployed = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'scripts/0g-test/_deployed.json'), 'utf8'));
const BOT_ADDR = deployed.contracts.BotINFT;

const botAbi = [
    'function bots(uint256) view returns (bytes32 personalityHash, string personalityURI, bytes32 memoryHash, string memoryURI, uint256 vaultBalance, uint256 lastDepositBlock, uint64 wins, uint64 losses, uint8 slot, uint8 tier)',
];

async function main() {
    if (!PERSONA_KEY || PERSONA_KEY.length !== 64) {
        console.error('❌ PERSONA_KEY missing or wrong length in .env.local');
        process.exit(1);
    }
    const key = Buffer.from(PERSONA_KEY, 'hex');

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const bot = new ethers.Contract(BOT_ADDR, botAbi, provider);

    console.log(`\n[Memory viewer] tokenId=${TOKEN_ID}`);
    const data = await bot.bots(BigInt(TOKEN_ID));
    console.log(`On-chain stats: wins=${data.wins} losses=${data.losses} tier=${Number(data.tier) === 1 ? 'Verified' : 'Rookie'}`);
    console.log(`memoryHash:     ${data.memoryHash}`);
    console.log(`memoryURI:      ${data.memoryURI}\n`);

    if (!data.memoryURI || data.memoryHash === '0x0000000000000000000000000000000000000000000000000000000000000000') {
        console.log('⚠️  No memory stored on-chain yet. Either:');
        console.log('   1. Bot has never been used in a match');
        console.log('   2. Match flow ran but post-match handler failed to update memory');
        console.log('   3. PERSONA_KEY missing on server during match resolution\n');
        process.exit(0);
    }

    const rootHash = data.memoryURI.replace('og-storage://', '');
    console.log(`Downloading from 0G Storage rootHash=${rootHash} ...`);
    const indexer = new Indexer(INDEXER);
    const [blob, err] = await indexer.downloadToBlob(rootHash, { proof: true });
    if (err) {
        console.error('Download failed:', err.message ?? err);
        process.exit(1);
    }
    const buf = Buffer.from(await blob.arrayBuffer());
    const encrypted = JSON.parse(buf.toString('utf8'));

    console.log(`Decrypting (algo=${encrypted.algo})...`);
    const iv = Buffer.from(encrypted.iv, 'hex');
    const ct = Buffer.from(encrypted.ciphertext, 'hex');
    const tag = Buffer.from(encrypted.authTag, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ct), decipher.final()]);
    const memory = JSON.parse(plaintext.toString('utf8'));

    console.log('\n=== BOT MEMORY (decrypted) ===');
    console.log(JSON.stringify(memory, null, 2));
}

main().catch((e) => {
    console.error('\n❌ ERROR:', e);
    process.exit(1);
});
