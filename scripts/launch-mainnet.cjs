/**
 * One-shot 0G mainnet launcher for 0xHuman.
 *
 * Pipeline:
 *   1. Sanity: confirm chain 16661 + wallet balance ≥ 40 0G
 *   2. Deploy BotINFT  (sends Solidity bytecode to chain)
 *   3. Deploy OxHuman  (sends Solidity bytecode to chain)
 *   4. Wire them (setBotINFT + setGameContract)
 *   5. Upload encrypted persona JSON to 0G Storage
 *   6. Mint free-slot bot with 30 0G initial vault deposit (one tx)
 *   7. Write _deployed-mainnet.json + print frontend env snippet
 *
 * Compute ledger funding + provider discovery is handled by a separate
 * sibling script (scripts/0g-test/fund-compute-mainnet.cjs); see runbook.
 *
 * Usage:
 *   # Dry-run on testnet first (no real 0G spent on mainnet):
 *   DRY_RUN=1 npx hardhat run scripts/launch-mainnet.cjs --network zeroGTestnet
 *
 *   # Real testnet rehearsal (spends testnet 0G):
 *   npx hardhat run scripts/launch-mainnet.cjs --network zeroGTestnet
 *
 *   # Real mainnet launch (spends real money):
 *   CONFIRM_MAINNET=yes-launch npx hardhat run scripts/launch-mainnet.cjs --network zeroGMainnet
 *
 * Env overrides (optional):
 *   PERSONA_SLUG=mochi          Persona file to mint (default: mochi)
 *   PERSONA_KEY_HEX=<64 hex>    AES-256 key for prompt encryption (auto-gen if absent)
 *   INITIAL_VAULT=30            Initial vault deposit in 0G (default: 30)
 *   STORAGE_INDEXER_MAINNET=<url>  Override mainnet 0G Storage indexer
 */

const fs = require('fs');
const path = require('path');

// ============ Config helpers ============

function readEnv(name, fallback) {
    const v = process.env[name];
    return v === undefined || v === '' ? fallback : v;
}

const DRY_RUN = readEnv('DRY_RUN', '0') === '1';
const CONFIRM_MAINNET = readEnv('CONFIRM_MAINNET', '');
const PERSONA_SLUG = readEnv('PERSONA_SLUG', 'mochi');
const INITIAL_VAULT_STR = readEnv('INITIAL_VAULT', '30');
// Set SKIP_MINT=1 when the seed bot will be minted via the /bots/create UI
// instead. Useful when the deployer wants to pick the persona interactively.
const SKIP_MINT = readEnv('SKIP_MINT', '0') === '1';

// ============ Main ============

async function main() {
    const hre = require('hardhat');
    const { ethers } = hre;

    const network = hre.network.name;
    const chainId = Number((await ethers.provider.getNetwork()).chainId);
    const isMainnet = chainId === 16661;
    const isTestnet = chainId === 16602;

    if (!isMainnet && !isTestnet) {
        throw new Error(`Unsupported chain ${chainId}. Use --network zeroGTestnet or zeroGMainnet.`);
    }

    if (isMainnet && CONFIRM_MAINNET !== 'yes-launch') {
        console.error(`
╔════════════════════════════════════════════════════════════════════╗
║  MAINNET GUARD                                                      ║
║                                                                     ║
║  You are targeting chain 16661 (0G mainnet). This will spend REAL   ║
║  0G tokens. To proceed, re-run with the confirmation flag:          ║
║                                                                     ║
║    CONFIRM_MAINNET=yes-launch npx hardhat run scripts/launch-       ║
║      mainnet.cjs --network zeroGMainnet                             ║
║                                                                     ║
╚════════════════════════════════════════════════════════════════════╝
`);
        process.exit(1);
    }

    const banner = isMainnet ? 'MAINNET LAUNCH' : DRY_RUN ? 'DRY-RUN (testnet)' : 'TESTNET REHEARSAL';
    console.log(`\n=== ${banner} ===\n`);

    const [deployer] = await ethers.getSigners();
    const balanceBefore = await ethers.provider.getBalance(deployer.address);
    const initialVault = ethers.parseEther(INITIAL_VAULT_STR);
    // Rough budget: deploy gas + (vault if minting) + 2 0G safety
    const vaultBudget = SKIP_MINT ? 0 : Number(INITIAL_VAULT_STR);
    const minBalance = ethers.parseEther(String(vaultBudget + 2.5));

    console.log(`Network:        ${network} (chainId ${chainId})`);
    console.log(`Deployer:       ${deployer.address}`);
    console.log(`Balance:        ${ethers.formatEther(balanceBefore)} 0G`);
    console.log(`Skip mint:      ${SKIP_MINT}`);
    if (!SKIP_MINT) {
        console.log(`Initial vault:  ${INITIAL_VAULT_STR} 0G`);
        console.log(`Persona slug:   ${PERSONA_SLUG}`);
    }
    console.log(`Dry-run:        ${DRY_RUN}\n`);

    if (balanceBefore < minBalance) {
        if (DRY_RUN) {
            console.log(
                `⚠ [DRY-RUN] balance ${ethers.formatEther(balanceBefore)} 0G < required ` +
                `${ethers.formatEther(minBalance)} 0G — would block a real run.\n`,
            );
        } else {
            throw new Error(
                `Wallet balance ${ethers.formatEther(balanceBefore)} 0G too low ` +
                `(need ≥ ${ethers.formatEther(minBalance)} 0G for deploy + vault + safety).`,
            );
        }
    }

    // ----- Read persona before any tx (only when minting) -----
    let persona = null;
    if (!SKIP_MINT) {
        const personaPath = path.resolve(process.cwd(), `data/personas/${PERSONA_SLUG}.json`);
        if (!fs.existsSync(personaPath)) {
            throw new Error(`Persona file not found: ${personaPath}`);
        }
        persona = JSON.parse(fs.readFileSync(personaPath, 'utf8'));
        console.log(`Persona loaded: ${persona.name} — "${persona.tagline}"\n`);
    }

    if (DRY_RUN) {
        console.log('[DRY-RUN] Would deploy BotINFT + OxHuman' + (SKIP_MINT ? '.' : ', mint persona, fund vault.'));
        console.log('[DRY-RUN] No transactions sent. Re-run without DRY_RUN=1 to execute.\n');
        return;
    }

    // ----- 1. Deploy BotINFT -----
    console.log('=== Deploying BotINFT ===');
    const t0 = Date.now();
    const BotINFT = await ethers.getContractFactory('BotINFT');
    const botINFT = await BotINFT.deploy();
    await botINFT.waitForDeployment();
    const botAddr = await botINFT.getAddress();
    const botRcpt = await botINFT.deploymentTransaction().wait();
    console.log(`✓ BotINFT  → ${botAddr}`);
    console.log(`  gas: ${botRcpt.gasUsed.toString()}, ${Date.now() - t0}ms\n`);

    // ----- 2. Deploy OxHuman -----
    console.log('=== Deploying OxHuman ===');
    const t1 = Date.now();
    const OxHuman = await ethers.getContractFactory('OxHuman');
    const oxhuman = await OxHuman.deploy();
    await oxhuman.waitForDeployment();
    const oxAddr = await oxhuman.getAddress();
    const oxRcpt = await oxhuman.deploymentTransaction().wait();
    console.log(`✓ OxHuman  → ${oxAddr}`);
    console.log(`  gas: ${oxRcpt.gasUsed.toString()}, ${Date.now() - t1}ms\n`);

    // ----- 3. Wire -----
    console.log('=== Wiring contracts ===');
    const wt0 = Date.now();
    await (await oxhuman.setBotINFT(botAddr)).wait();
    await (await botINFT.setGameContract(oxAddr)).wait();
    console.log(`✓ Wired (${Date.now() - wt0}ms)\n`);

    let tokenId = null;
    let rootHash = null;
    let personalityHash = null;
    let symmetricKey = null;
    let botData = null;

    if (!SKIP_MINT) {
        // ----- 4. Upload encrypted persona to 0G Storage -----
        console.log('=== Uploading persona to 0G Storage ===');
        const personaKeyHex = readEnv('PERSONA_KEY_HEX', '');
        symmetricKey = personaKeyHex
            ? Buffer.from(personaKeyHex, 'hex')
            : require('crypto').randomBytes(32);
        if (!personaKeyHex) {
            console.log(`  ⚠ Generated fresh AES-256 key. PERSIST IT or the bot is unusable:`);
            console.log(`    PERSONA_KEY_HEX=${symmetricKey.toString('hex')}`);
        }

        // Lazy-load storage module (ESM via createRequire) inside .cjs context
        const { spawnSync } = require('child_process');
        const personaJson = JSON.stringify(persona);
        const tmpPath = path.resolve(process.cwd(), `.tmp-persona-${PERSONA_SLUG}.json`);
        fs.writeFileSync(tmpPath, personaJson);

        const uploaderArgs = [
            'tsx',
            path.resolve(process.cwd(), 'scripts/internal/upload-persona-helper.ts'),
            '--persona',
            tmpPath,
            '--key',
            symmetricKey.toString('hex'),
            '--network',
            isMainnet ? 'mainnet' : 'testnet',
        ];
        const uploadResult = spawnSync('npx', uploaderArgs, {
            encoding: 'utf8',
            env: {
                ...process.env,
                STORAGE_PRIVATE_KEY: process.env.PRIVATE_KEY,
            },
        });
        fs.unlinkSync(tmpPath);
        if (uploadResult.status !== 0) {
            console.error(uploadResult.stderr);
            throw new Error('persona upload helper failed');
        }
        const uploadOutput = JSON.parse(uploadResult.stdout.trim().split('\n').pop());
        rootHash = uploadOutput.rootHash;
        const { txHash: uploadTx, sizeBytes } = uploadOutput;
        personalityHash = ethers.keccak256(ethers.toUtf8Bytes(personaJson));
        console.log(`✓ Storage rootHash: ${rootHash}`);
        console.log(`✓ Storage tx:       ${uploadTx}`);
        console.log(`✓ Size:             ${sizeBytes} bytes`);
        console.log(`✓ personalityHash:  ${personalityHash}\n`);

        // ----- 5. Mint free-slot bot -----
        console.log(`=== Minting free-slot bot with ${INITIAL_VAULT_STR} 0G vault ===`);
        const mintTx = await botINFT.mintFreeSlot(rootHash, personalityHash, { value: initialVault });
        const mintRcpt = await mintTx.wait();
        // Parse BotMinted event for tokenId
        for (const log of mintRcpt.logs) {
            try {
                const parsed = botINFT.interface.parseLog(log);
                if (parsed && parsed.name === 'BotMinted') {
                    tokenId = parsed.args.tokenId;
                    break;
                }
            } catch {
                // ignore non-matching logs
            }
        }
        if (tokenId === null) throw new Error('Could not find BotMinted event in receipt');
        console.log(`✓ Bot minted: tokenId=${tokenId.toString()}, owner=${deployer.address}`);
        console.log(`  mint tx: ${mintRcpt.hash}, gas: ${mintRcpt.gasUsed}\n`);

        // ----- 6. Sanity reads -----
        botData = await botINFT.bots(tokenId);
        console.log('=== Bot state ===');
        console.log(`  vaultBalance:   ${ethers.formatEther(botData.vaultBalance)} 0G`);
        console.log(`  slot:           ${botData.slot}`);
        console.log(`  tier:           ${botData.tier === 1n ? 'Verified' : 'Rookie'}`);
        console.log(`  personalityURI: ${botData.personalityURI}\n`);
    } else {
        console.log('=== Skipping persona upload + bot mint (SKIP_MINT=1) ===');
        console.log('   Mint your seed bot via /bots/create after the frontend is\n');
        console.log('   pointed at the new mainnet addresses.\n');
    }

    // ----- 7. Write deployment record -----
    const balanceAfter = await ethers.provider.getBalance(deployer.address);
    const totalCost = balanceBefore - balanceAfter;
    const record = {
        network,
        chainId,
        deployedAt: new Date().toISOString(),
        deployer: deployer.address,
        contracts: { BotINFT: botAddr, OxHuman: oxAddr },
        seedBot: tokenId === null ? null : {
            tokenId: tokenId.toString(),
            personalityURI: rootHash,
            personalityHash,
            vaultBalance: ethers.formatEther(botData.vaultBalance),
            slug: PERSONA_SLUG,
        },
        explorerBaseUrl: isMainnet
            ? 'https://chainscan.0g.ai'
            : 'https://chainscan-galileo.0g.ai',
        totalCost0G: ethers.formatEther(totalCost),
    };
    const outName = isMainnet ? '_deployed-mainnet.json' : '_deployed.json';
    const outPath = path.resolve(process.cwd(), `scripts/0g-test/${outName}`);
    fs.writeFileSync(outPath, JSON.stringify(record, null, 2));
    console.log(`✓ Deployment record: ${outPath}`);

    // ----- 8. Summary + next steps -----
    console.log(`\n=== LAUNCH SUMMARY ===`);
    console.log(`Total cost:  ${ethers.formatEther(totalCost)} 0G`);
    console.log(`Remaining:   ${ethers.formatEther(balanceAfter)} 0G`);
    console.log(`\nBotINFT:    ${record.explorerBaseUrl}/address/${botAddr}`);
    console.log(`OxHuman:    ${record.explorerBaseUrl}/address/${oxAddr}`);
    if (tokenId !== null) {
        console.log(`Bot #${tokenId}:   ${record.explorerBaseUrl}/token/${botAddr}?a=${tokenId}\n`);
    } else {
        console.log(`Seed bot:   (not minted — use the /bots/create UI)\n`);
    }

    if (isMainnet) {
        console.log(`=== NEXT STEPS ===`);
        console.log(`1. Update src/lib/chain.ts → ADDRESSES_BY_CHAIN[16661]:`);
        console.log(`     OxHuman: '${oxAddr}'`);
        console.log(`     BotINFT: '${botAddr}'`);
        console.log(`\n2. Update VPS .env:`);
        console.log(`     NETWORK=mainnet`);
        console.log(`     OXHUMAN_ADDRESS=${oxAddr}`);
        console.log(`     BOTINFT_ADDRESS=${botAddr}`);
        if (symmetricKey) {
            console.log(`     PERSONA_KEY_HEX=${symmetricKey.toString('hex')}`);
        } else {
            console.log(`     PERSONA_KEY_HEX=<re-use existing or generate fresh>`);
        }
        console.log(`\n3. On VPS: git pull && npm run build && pm2 restart all`);
        console.log(`\n4. Fund compute ledger separately:`);
        console.log(`     CONFIRM_MAINNET=yes-fund node scripts/0g-test/fund-compute-mainnet.cjs`);
        if (tokenId === null) {
            console.log(`\n5. Open ${isMainnet ? 'production' : 'local'} site → /bots/create to mint your seed bot.\n`);
        }
    }
}

main().catch((e) => {
    console.error('\n❌ LAUNCH FAILED:', e);
    process.exit(1);
});
