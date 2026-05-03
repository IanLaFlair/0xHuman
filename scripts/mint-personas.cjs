/**
 * Mint the 5 hand-crafted bot personas as INFTs on 0G.
 *
 * Flow per persona:
 *   1. Read JSON from data/personas/<name>.json
 *   2. Encrypt prompt blob with admin's symmetric key (from env)
 *   3. Upload encrypted blob to 0G Storage → get rootHash
 *   4. Mint via BotINFT.mintFreeSlot or mintPaidSlot (depending on slot strategy)
 *   5. Record mapping {personaName, tokenId, personalityURI, encryptedBlobHash}
 *
 * Strategy:
 *   - Bot 1 (Mochi):    free slot
 *   - Bots 2-3 (Skibidi, Hacker): paid slot 2/3 in another wallet (or skip for hackathon)
 *   - For demo: just mint Mochi free + Skibidi paid (covers both flows)
 *   - To mint all 5, would need either multiple wallets or to deploy a separate
 *     mintBatch function. Hackathon scope: 5 free slots from 5 different wallets,
 *     OR skip and just demo with 2-3 personas
 *
 * USAGE:
 *   PRIVATE_KEY=...  PERSONA_KEY=<32-byte-hex>  \
 *     npx hardhat run scripts/mint-personas.cjs --network zeroGTestnet
 *
 * Requires:
 *   - At least 2 0G in wallet for free slot mint (or 15 / 35 for paid)
 *   - PERSONA_KEY env var: 64-hex-char AES-256 key (one shared key for all personas
 *     in admin's hands — production would derive per-bot keys)
 *   - Deployed BotINFT address (read from scripts/0g-test/_deployed.json)
 */

const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');
const requireCjs = createRequire(__filename);
const { Indexer, MemData } = requireCjs('@0gfoundation/0g-storage-ts-sdk');
const crypto = require('crypto');

const PERSONAS_DIR = path.resolve(__dirname, '../data/personas');
const DEPLOYED_PATH = path.resolve(__dirname, '0g-test/_deployed.json');
const OUTPUT_PATH = path.resolve(__dirname, '../data/_minted-personas.json');
const INDEXER_RPC = 'https://indexer-storage-testnet-turbo.0g.ai';

// Persona load order. First = free slot. Subsequent = paid (slot 2 or 3).
// For multi-wallet strategy, deploy this once per wallet.
const PERSONA_ORDER = ['mochi', 'skibidi', 'hacker', 'grandma', 'edgyteen'];

function loadPersona(name) {
    const filePath = path.join(PERSONAS_DIR, `${name}.json`);
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadDeployed() {
    if (!fs.existsSync(DEPLOYED_PATH)) {
        throw new Error(`Run deploy-full.cjs first — no _deployed.json at ${DEPLOYED_PATH}`);
    }
    return JSON.parse(fs.readFileSync(DEPLOYED_PATH, 'utf8'));
}

function encryptPersona(persona, key32) {
    const iv = crypto.randomBytes(12);
    const plaintext = Buffer.from(JSON.stringify(persona), 'utf8');
    const cipher = crypto.createCipheriv('aes-256-gcm', key32, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return {
        iv: iv.toString('hex'),
        ciphertext: ciphertext.toString('hex'),
        authTag: authTag.toString('hex'),
        algo: 'aes-256-gcm',
    };
}

async function uploadEncrypted(blob, signer, evmRpc) {
    const json = JSON.stringify(blob);
    const bytes = new TextEncoder().encode(json);
    const memData = new MemData(bytes);
    const indexer = new Indexer(INDEXER_RPC);
    const [result, err] = await indexer.upload(memData, evmRpc, signer);
    if (err) throw new Error(`upload failed: ${err.message ?? err}`);
    const rootHash = result.rootHash ?? result.rootHashes?.[0];
    const txHash = result.txHash ?? result.txHashes?.[0];
    return { rootHash, txHash };
}

async function main() {
    const hre = require('hardhat');
    const { ethers } = hre;

    // Load deployment record
    const deployed = loadDeployed();
    const botINFTAddress = deployed.contracts.BotINFT;
    if (!botINFTAddress) throw new Error('BotINFT address missing from _deployed.json');
    console.log(`\n[Mint Personas] BotINFT: ${botINFTAddress}\n`);

    // Encryption key (admin-side; one shared key for all dev-owned personas)
    const personaKeyHex = process.env.PERSONA_KEY;
    if (!personaKeyHex || personaKeyHex.length !== 64) {
        // Generate a fresh one and instruct user to save it
        const fresh = crypto.randomBytes(32).toString('hex');
        console.error('❌ PERSONA_KEY env var missing or wrong length (need 64 hex chars / 32 bytes).');
        console.error('Generated fresh key for you — save this and re-run with it set:\n');
        console.error(`  export PERSONA_KEY=${fresh}\n`);
        process.exit(1);
    }
    const personaKey = Buffer.from(personaKeyHex, 'hex');

    // Connect contract
    const [deployer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`Signer:    ${deployer.address}`);
    console.log(`Balance:   ${ethers.formatEther(balance)} 0G\n`);

    const BotINFT = await ethers.getContractAt('BotINFT', botINFTAddress);

    // What slot are we minting?
    const slotsOwned = await BotINFT.slotsOwned(deployer.address);
    console.log(`Slots owned by signer: ${slotsOwned}\n`);

    if (slotsOwned >= 3) {
        throw new Error('Wallet already has 3 bots. Use a different wallet to continue.');
    }

    const minted = [];
    const evmRpc = hre.network.config.url;

    // Pick personas to mint based on remaining slot capacity
    const personasToMint = PERSONA_ORDER.slice(Number(slotsOwned), 3); // up to 3 per wallet
    if (personasToMint.length === 0) {
        console.log('Nothing to mint for this wallet.');
        return;
    }

    for (let i = 0; i < personasToMint.length; i++) {
        const personaName = personasToMint[i];
        const slotNum = Number(slotsOwned) + i + 1;
        const persona = loadPersona(personaName);

        console.log(`=== ${persona.name} (slot ${slotNum}) ===`);

        // Encrypt
        const encrypted = encryptPersona(persona, personaKey);
        console.log(`  encrypted: ${encrypted.ciphertext.length / 2} bytes ciphertext`);

        // Upload
        const tUp = Date.now();
        const { rootHash, txHash } = await uploadEncrypted(encrypted, deployer, evmRpc);
        console.log(`  storage:   ${rootHash} (${Date.now() - tUp}ms)`);

        // Mint
        const personalityHash = '0x' + crypto.createHash('sha256').update(JSON.stringify(encrypted)).digest('hex');
        const personalityURI = `og-storage://${rootHash}`;

        let mintTx;
        if (slotNum === 1) {
            mintTx = await BotINFT.mintFreeSlot(personalityURI, personalityHash, {
                value: ethers.parseEther('2'),
            });
        } else if (slotNum === 2) {
            mintTx = await BotINFT.mintPaidSlot(2, personalityURI, personalityHash, {
                value: ethers.parseEther('15'),
            });
        } else {
            mintTx = await BotINFT.mintPaidSlot(3, personalityURI, personalityHash, {
                value: ethers.parseEther('35'),
            });
        }
        const rcpt = await mintTx.wait();
        const cost = rcpt.gasUsed * rcpt.gasPrice;
        console.log(`  mint tx:   ${rcpt.hash} (gas ${rcpt.gasUsed}, ${ethers.formatEther(cost)} 0G)`);

        // Find tokenId from logs (Transfer event)
        const transferEvent = rcpt.logs.find((l) => {
            try {
                const parsed = BotINFT.interface.parseLog(l);
                return parsed && parsed.name === 'Transfer';
            } catch {
                return false;
            }
        });
        let tokenId = null;
        if (transferEvent) {
            const parsed = BotINFT.interface.parseLog(transferEvent);
            tokenId = parsed.args.tokenId.toString();
        }
        console.log(`  tokenId:   ${tokenId}\n`);

        minted.push({
            persona: persona.name,
            slot: slotNum,
            tokenId,
            owner: deployer.address,
            personalityURI,
            personalityHash,
            storageRootHash: rootHash,
            storageTxHash: txHash,
            mintTxHash: rcpt.hash,
            mintedAt: new Date().toISOString(),
        });
    }

    // Save record
    const out = {
        botINFT: botINFTAddress,
        encryptionKey: '<set via PERSONA_KEY env var, not stored here>',
        minted,
    };
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(out, null, 2));
    console.log(`\n✓ Saved record: ${OUTPUT_PATH}\n`);

    const balanceAfter = await ethers.provider.getBalance(deployer.address);
    console.log(`Total spent: ${ethers.formatEther(balance - balanceAfter)} 0G`);
    console.log(`Remaining:   ${ethers.formatEther(balanceAfter)} 0G\n`);
}

main().catch((e) => {
    console.error('\n❌ ERROR:', e);
    process.exit(1);
});
