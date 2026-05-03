/**
 * 0G Compute — Hello World Inference
 *
 * GATED: requires sub-account funding ≥ 1 0G.
 *
 * Flow:
 * 1. Init authenticated broker with signer
 * 2. Fund sub-account on chosen provider
 * 3. Acknowledge provider TEE signer
 * 4. Send chat completion
 * 5. Verify TEE attestation via processResponse()
 *
 * Reference provider (Galileo testnet):
 *   0xa48f01287233509FD694a22Bf840225062E67836  (qwen/qwen-2.5-7b-instruct)
 */

const {
    createZGComputeNetworkBroker,
} = require('@0gfoundation/0g-compute-ts-sdk');
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

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

const RPC_URL = 'https://evmrpc-testnet.0g.ai';
const PROVIDER_ADDRESS = '0xa48f01287233509FD694a22Bf840225062E67836'; // Qwen 2.5 7B
const FUND_AMOUNT = process.env.FUND_AMOUNT || '0.1'; // 0G to add to sub-account
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!PRIVATE_KEY) {
    console.error('❌ PRIVATE_KEY not found in .env.local');
    process.exit(1);
}

async function main() {
    console.log(`\n[0G Compute] Inference hello-world\n`);

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const address = await signer.getAddress();
    const balance = await provider.getBalance(address);

    console.log(`Signer:    ${address}`);
    console.log(`Balance:   ${ethers.formatEther(balance)} 0G`);

    if (balance < ethers.parseEther('1.0')) {
        console.warn('\n⚠️  WARNING: balance <1 0G. Sub-account funding may fail.');
        console.warn('Continuing anyway to test broker init…\n');
    }

    const t0 = Date.now();
    const broker = await createZGComputeNetworkBroker(signer);
    console.log(`\n✓ Authenticated broker initialized (${Date.now() - t0}ms)`);

    // Fund sub-account on chosen provider
    console.log(`\n=== FUND SUB-ACCOUNT ===`);
    console.log(`Provider:  ${PROVIDER_ADDRESS}`);
    console.log(`Amount:    ${FUND_AMOUNT} 0G`);
    try {
        const tFund = Date.now();
        await broker.ledger.depositFund(FUND_AMOUNT);
        console.log(`✓ Deposit OK (${Date.now() - tFund}ms)`);
    } catch (e) {
        console.error(`❌ Fund failed: ${e.message}`);
        console.error('Continuing — perhaps already funded.\n');
    }

    // Acknowledge TEE signer (one-time per provider)
    console.log(`\n=== ACK TEE SIGNER ===`);
    try {
        const tAck = Date.now();
        await broker.inference.acknowledgeProviderSigner(PROVIDER_ADDRESS);
        console.log(`✓ TEE signer acknowledged (${Date.now() - tAck}ms)`);
    } catch (e) {
        console.log(`⚠️  acknowledgeProviderSigner: ${e.message} (likely already acked)`);
    }

    // Get service metadata
    console.log(`\n=== SERVICE METADATA ===`);
    const meta = await broker.inference.getServiceMetadata(PROVIDER_ADDRESS);
    console.log(`Endpoint: ${meta.endpoint}`);
    console.log(`Model:    ${meta.model}`);

    // Build request
    const messages = [
        { role: 'system', content: 'You are Mochi, a 22-year-old gen-z cat lover. Reply briefly in chill tone.' },
        { role: 'user', content: 'sup, what kind of music you into' },
    ];

    const headers = await broker.inference.getRequestHeaders(PROVIDER_ADDRESS, JSON.stringify(messages));

    console.log(`\n=== INFERENCE CALL ===`);
    const tInfer = Date.now();
    const response = await fetch(`${meta.endpoint}/v1/proxy/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ messages, model: meta.model }),
    });
    const inferMs = Date.now() - tInfer;

    if (!response.ok) {
        console.error(`❌ HTTP ${response.status}: ${await response.text()}`);
        process.exit(1);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || '(no content)';
    const chatId = response.headers.get('zg-res-key') || response.headers.get('ZG-Res-Key');

    console.log(`✓ Response received (${inferMs}ms)`);
    console.log(`\nReply:\n  "${reply}"`);
    console.log(`\nchatID: ${chatId}`);

    // Verify TEE attestation
    if (chatId) {
        console.log(`\n=== TEE VERIFICATION ===`);
        const tVerify = Date.now();
        try {
            const isValid = await broker.inference.processResponse(PROVIDER_ADDRESS, chatId);
            console.log(`✓ Verification ${isValid ? 'PASSED ✅' : 'FAILED ❌'} (${Date.now() - tVerify}ms)`);
        } catch (e) {
            console.error(`❌ Verification error: ${e.message}`);
        }
    } else {
        console.warn(`⚠️  No chatID in response headers; cannot verify`);
    }

    console.log(`\n=== SUMMARY ===`);
    console.log(`Inference latency: ${inferMs}ms (target <2000ms)`);
    console.log(`Reply length:      ${reply.length} chars`);
    console.log(`UX verdict:        ${inferMs < 2000 ? '✓ ACCEPTABLE' : '⚠️ TOO SLOW'}\n`);
}

main().catch((e) => {
    console.error('\n❌ ERROR:', e);
    process.exit(1);
});
