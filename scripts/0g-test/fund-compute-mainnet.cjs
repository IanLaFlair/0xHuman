/**
 * Bootstrap the 0G Compute broker ledger on MAINNET.
 *
 * Funds a sub-account so getRequestHeaders() can sign inference calls
 * against the chosen TEE-attested provider. The broker ledger has a hard
 * ~3 0G minimum; we default to 5 0G for headroom.
 *
 * Pipeline:
 *   1. Sanity: confirm mainnet RPC + wallet balance ≥ fund amount + gas
 *   2. Resolve provider (env override or auto-pick first Qwen)
 *   3. broker.ledger.depositFund(amount)  (fallback to addLedger on first-time)
 *   4. broker.inference.acknowledgeProviderSigner(provider)
 *   5. Verify by reading service metadata
 *
 * Usage:
 *   # Default 5 0G to auto-picked Qwen provider:
 *   CONFIRM_MAINNET=yes-fund node scripts/0g-test/fund-compute-mainnet.cjs
 *
 *   # Explicit amount + provider override:
 *   CONFIRM_MAINNET=yes-fund \
 *   FUND_AMOUNT=10 \
 *   COMPUTE_PROVIDER_MAINNET=0x... \
 *     node scripts/0g-test/fund-compute-mainnet.cjs
 *
 *   # Optional smoke inference to prove the full path works:
 *   CONFIRM_MAINNET=yes-fund TEST_INFERENCE=1 \
 *     node scripts/0g-test/fund-compute-mainnet.cjs
 */

require('dotenv').config({ path: '.env.local' });

const {
    createZGComputeNetworkBroker,
    createZGComputeNetworkReadOnlyBroker,
} = require('@0gfoundation/0g-compute-ts-sdk');
const { ethers } = require('ethers');

const RPC_URL = process.env.RPC_URL || 'https://evmrpc.0g.ai';
const FUND_AMOUNT = process.env.FUND_AMOUNT || '5';
const PROVIDER_OVERRIDE = process.env.COMPUTE_PROVIDER_MAINNET;
const CONFIRM = process.env.CONFIRM_MAINNET;
const RUN_INFERENCE = process.env.TEST_INFERENCE === '1';
const PRIVATE_KEY = process.env.PRIVATE_KEY;

async function pickQwenProvider() {
    if (PROVIDER_OVERRIDE) return PROVIDER_OVERRIDE;
    console.log('Discovering Qwen provider via listService()...');
    const ro = await createZGComputeNetworkReadOnlyBroker(RPC_URL);
    const svcs = await ro.inference.listService();
    const candidates = svcs.filter((s) => {
        const m = (s.model || '').toLowerCase();
        const vl = m.includes('vl') || m.includes('vision');
        return m.includes('qwen') && !vl && (s.serviceType || '').toLowerCase().includes('chat');
    });
    if (candidates.length === 0) {
        throw new Error('No non-vision Qwen chat provider found on mainnet — set COMPUTE_PROVIDER_MAINNET explicitly');
    }
    candidates.sort((a, b) => {
        const ap = BigInt(a.inputPrice ?? 0n);
        const bp = BigInt(b.inputPrice ?? 0n);
        return ap < bp ? -1 : ap > bp ? 1 : 0;
    });
    console.log(`✓ Picked: ${candidates[0].provider} (${candidates[0].model})\n`);
    return candidates[0].provider;
}

async function main() {
    if (!PRIVATE_KEY) {
        throw new Error('PRIVATE_KEY not set (check .env.local)');
    }
    if (CONFIRM !== 'yes-fund') {
        console.error(`
╔════════════════════════════════════════════════════════════════════╗
║  MAINNET FUNDING GUARD                                              ║
║                                                                     ║
║  This will deposit ${FUND_AMOUNT} 0G into the Compute broker ledger on        ║
║  mainnet (chain 16661). To proceed, re-run with:                    ║
║                                                                     ║
║    CONFIRM_MAINNET=yes-fund node scripts/0g-test/fund-compute-      ║
║      mainnet.cjs                                                    ║
║                                                                     ║
╚════════════════════════════════════════════════════════════════════╝
`);
        process.exit(1);
    }

    console.log(`\n=== 0G COMPUTE MAINNET BOOTSTRAP ===\n`);
    console.log(`RPC:           ${RPC_URL}`);
    console.log(`Fund amount:   ${FUND_AMOUNT} 0G`);
    console.log(`Test inference: ${RUN_INFERENCE ? 'yes' : 'no'}\n`);

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const address = await signer.getAddress();
    const balance = await provider.getBalance(address);
    const minBalance = ethers.parseEther(String(Number(FUND_AMOUNT) + 0.5));

    console.log(`Signer:    ${address}`);
    console.log(`Balance:   ${ethers.formatEther(balance)} 0G`);
    if (balance < minBalance) {
        throw new Error(
            `Balance ${ethers.formatEther(balance)} 0G < required ${ethers.formatEther(minBalance)} 0G ` +
            `(fund amount + gas).`,
        );
    }

    const providerAddr = await pickQwenProvider();
    console.log(`Provider:  ${providerAddr}\n`);

    // ----- Initialise authenticated broker -----
    const t0 = Date.now();
    const broker = await createZGComputeNetworkBroker(signer);
    console.log(`✓ Broker initialised (${Date.now() - t0}ms)\n`);

    // ----- Fund ledger -----
    console.log(`=== FUND LEDGER (${FUND_AMOUNT} 0G) ===`);
    try {
        const tF = Date.now();
        await broker.ledger.depositFund(Number(FUND_AMOUNT));
        console.log(`✓ depositFund OK (${Date.now() - tF}ms)\n`);
    } catch (e) {
        console.log(`depositFund failed (${e.message}), trying addLedger...`);
        try {
            await broker.ledger.addLedger(Number(FUND_AMOUNT));
            console.log('✓ Ledger created via addLedger\n');
        } catch (e2) {
            throw new Error(`Both depositFund and addLedger failed: ${e2.message}`);
        }
    }

    // ----- Acknowledge TEE signer -----
    console.log(`=== ACK TEE SIGNER ===`);
    try {
        const tA = Date.now();
        await broker.inference.acknowledgeProviderSigner(providerAddr);
        console.log(`✓ TEE signer acknowledged (${Date.now() - tA}ms)\n`);
    } catch (e) {
        console.log(`⚠ acknowledgeProviderSigner: ${e.message}`);
        console.log('  (usually means already acknowledged — safe to ignore)\n');
    }

    // ----- Verify metadata read -----
    console.log(`=== VERIFY METADATA ===`);
    const meta = await broker.inference.getServiceMetadata(providerAddr);
    console.log(`Endpoint:  ${meta.endpoint}`);
    console.log(`Model:     ${meta.model}\n`);

    // ----- Optional smoke inference -----
    if (RUN_INFERENCE) {
        console.log(`=== SMOKE INFERENCE ===`);
        const body = JSON.stringify({
            messages: [
                { role: 'system', content: 'Reply in 1 short sentence, casual tone.' },
                { role: 'user', content: 'sup, ready to launch?' },
            ],
            model: meta.model,
            temperature: 0.8,
            max_tokens: 40,
        });
        const headers = await broker.inference.getRequestHeaders(providerAddr, body);
        const tI = Date.now();
        const resp = await fetch(`${meta.endpoint}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
            body,
        });
        const latency = Date.now() - tI;
        if (!resp.ok) {
            console.log(`❌ HTTP ${resp.status}: ${await resp.text()}`);
        } else {
            const data = await resp.json();
            const reply = data.choices?.[0]?.message?.content ?? '(empty)';
            const chatId = resp.headers.get('zg-res-key') || resp.headers.get('ZG-Res-Key');
            console.log(`Reply (${latency}ms): "${reply}"`);
            console.log(`chatId:    ${chatId}`);
            if (chatId) {
                const ok = await broker.inference.processResponse(providerAddr, chatId);
                console.log(`TEE attestation verified: ${ok}\n`);
            }
        }
    }

    // ----- Done -----
    const balanceAfter = await provider.getBalance(address);
    const spent = balance - balanceAfter;
    console.log(`=== SUMMARY ===`);
    console.log(`Spent:       ${ethers.formatEther(spent)} 0G`);
    console.log(`Remaining:   ${ethers.formatEther(balanceAfter)} 0G`);
    console.log(`\nNext: lib/0g-compute.ts → DEFAULT_MAINNET_CONFIG.providerAddress = '${providerAddr}'\n`);
}

main().catch((e) => {
    console.error('\n❌ FAILED:', e);
    process.exit(1);
});
