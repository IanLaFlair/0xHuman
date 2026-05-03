# 0G Integration — SDK Reality Check & Findings

> Working reference for hackathon implementation. Captures what actually works in 0G's SDKs vs what we assumed in the master plan. Updated as we discover more.
>
> **Date:** 3 May 2026 (Day 1)
> **Status:** Initial research complete. No SDK code executed yet. Discord questions outstanding.

---

## TL;DR — Verdict per Module

| Module | Status | Action |
|---|---|---|
| 0G Chain (mainnet & testnet) | ✅ Ready, EVM-compatible | Deploy via Hardhat, no code change |
| 0G Storage SDK | ✅ Mature, TS SDK works | Use for chat transcripts + encrypted bot prompts |
| 0G Compute SDK | ✅ Works, **but TEE-attested NOT ZK** | Pitch must say "TEE-attested" — adjust language |
| ERC-7857 INFT | ✅ Full docs + integration guide | Implement per-bot vault on top of ERC-7857 |
| Persistent Memory | ⏳ Coming soon | Sebut di roadmap, jangan implement |
| AI Alignment Nodes | ⏳ Available but for ops, not direct integration | Sebut di roadmap |

**Net:** Plan tetap jalan, **pitch perlu adjust language** dari "ZK-verifiable inference" jadi "TEE-attested inference verifiable on-chain".

---

## 1. 0G Chain — Network Configuration

### Mainnet (production submission)
| Field | Value |
|---|---|
| Chain ID | `16661` |
| RPC URL | `https://evmrpc.0g.ai` |
| Explorer | `https://chainscan.0g.ai` |
| Gas token | `0G` |
| Finality | Sub-second |
| Throughput | ~11,000 TPS per shard |
| EVM compat | Full (Solidity contracts deploy unchanged) |

### Galileo Testnet (dev iteration)
| Field | Value |
|---|---|
| Chain ID | `16602` |
| RPC URL | `https://evmrpc-testnet.0g.ai` |
| Explorer | `https://chainscan-galileo.0g.ai` |
| Faucet | `https://faucet.0g.ai` |
| Backup faucet | Google Cloud — `cloud.google.com/application/web3/faucet/0g/galileo` |
| **Faucet limit** | ⚠️ **0.1 0G per wallet per day** — VERY TIGHT |

### Faucet capital strategy ⚠️
0.1 0G/day per wallet won't cover testing budget. Plan:
- Rotate 5-10 dev wallets, request faucet from each daily
- Ask 0G Discord (`discord.gg/0glabs`) for bulk testnet allocation as hackathon participants
- Deploy script that minimizes contract deployment cost via single multi-purpose contract
- Cap PvE testing to Rookie tier (small stakes) until faucet flow stable

### Hardhat config snippet (template)
```js
// hardhat.config.ts
networks: {
  zeroGTestnet: {
    url: "https://evmrpc-testnet.0g.ai",
    chainId: 16602,
    accounts: [process.env.PRIVATE_KEY]
  },
  zeroGMainnet: {
    url: "https://evmrpc.0g.ai",
    chainId: 16661,
    accounts: [process.env.PRIVATE_KEY]
  }
}
```

---

## 2. 0G Storage SDK

### Package
- TypeScript: `@0gfoundation/0g-storage-ts-sdk`
- Go: also available (untuk backend kalau perlu)

### Use cases di 0xHuman
| Data type | Layer | Encryption |
|---|---|---|
| Chat transcripts (post-match) | Log archival | None (public for dispute resolution) |
| Bot system prompt (INFT metadata) | Log + indexed by KV | **AES-256 client-side** before upload |
| Bot avatar/image | Log | None |

### Upload pattern (TS)
```ts
import { MemData, Indexer } from '@0gfoundation/0g-storage-ts-sdk';

// Chat transcript example
const transcript = { matchId, p1: addr, p2: addr, messages: [...] };
const bytes = new TextEncoder().encode(JSON.stringify(transcript));
const memData = new MemData(bytes);
const [tx, err] = await indexer.upload(memData, RPC_URL, signer);
// returns rootHash
```

### Download pattern
```ts
const [blob, dlErr] = await indexer.downloadToBlob(rootHash, { proof: true });
```

### Encryption support
- **AES-256:** 32-byte symmetric key, 17-byte header
- **ECIES:** secp256k1 keypair, 50-byte header
- Files encrypted client-side before upload, auto-detect on download
- **Critical for INFT bot prompt protection** — prompt never visible to anyone except bot owner + TEE during inference

### Empirical numbers — Day 2 roundtrip test

Test: Upload + download 532-byte JSON chat transcript on Galileo testnet.

| Metric | Value |
|---|---|
| Indexer endpoint | `https://indexer-storage-testnet-turbo.0g.ai` |
| Storage flow contract | `0x22e03a6a89b950f1c82ec5e74f8eca321a105296` (Galileo) |
| Payload size | 532 bytes |
| Upload latency | **10.7s** (slow — background-only, never block UX) |
| Download latency | **1.8s** (fast — receipt UI works in user time) |
| Upload cost | **0.00125 0G per ~500-byte blob** |
| Round-trip integrity | ✓ MATCH |
| Replication | 4 storage nodes hosting; 2 selected for download (random) |
| Storage fee paid | 92,200,934,886 wei = ~9.2e-8 0G storage fee component |

**Cost projection per match:** ~0.00125 0G untuk transcript. 100 test matches = 0.125 0G. Negligible.

### Implications for our app

- ✅ **Upload async, never block match flow** — 10s is fine post-match, hidden
- ✅ **Download synchronous in receipt page** — 1.8s acceptable
- ✅ **Cost is non-issue** — even thousands of matches stays under 1 0G
- ⚠️ **No file size limit observed** — but tested only 532 bytes. Larger blobs may differ. Test ~5-10 KB before relying on it for memory state files.

### Still open
- ❓ KV layer (`@0gfoundation/0g-storage-ts-sdk` exports `kv` module) — we don't need it for hackathon scope; chat transcripts work fine on Log layer

---

## 3. 0G Compute Network — Inference

### Package
- `@0gfoundation/0g-compute-ts-sdk`
- OpenAI-compatible HTTP API

### ⚠️ Reality check: It's TEE-attested, NOT ZK-per-inference

The marketing landing page says "ZK-verifiable settlement" — but that refers to **fee/billing settlement on-chain**, NOT per-inference cryptographic proof. Actual inference verification is via **TEE provider signatures**.

**Pitch adjustment required:**
- ❌ Don't say: "ZK-proof per AI response"
- ✅ Do say: "TEE-attested inference, verifiable on-chain via provider signature"
- ✅ Do say: "Settlement layer is ZK-verifiable" (separate sentence, accurate)

### Code pattern
```ts
// Get provider metadata
const { endpoint, model } = await broker.inference.getServiceMetadata(providerAddress);
const headers = await broker.inference.getRequestHeaders(providerAddress);

// Call inference (looks like OpenAI)
const response = await fetch(`${endpoint}/chat/completions`, {
  method: "POST",
  headers: { "Content-Type": "application/json", ...headers },
  body: JSON.stringify({
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
    model
  })
});
const data = await response.json();
const chatID = response.headers.get('ZG-Res-Key'); // for verification

// Verify TEE attestation
const isValid = await broker.inference.processResponse(providerAddress, chatID);
```

### Endpoints
- `/v1/proxy/chat/completions` — text chat (← what we use for bot replies)
- `/v1/proxy/images/generations` — image gen (could be used for bot avatars)
- `/v1/proxy/audio/transcriptions` — STT (not relevant)

### Constraints
| Limit | Value | Impact on us |
|---|---|---|
| Rate limit | 30 req/min per user | Sufficient for ~30 concurrent matches at 1 turn/match/min |
| Concurrent | 5 max | Need queue if matches > 5 |
| Min balance | 1 0G per provider sub-account | Backend wallet needs preloaded balance |
| Latency | Not specified | ⚠️ Must benchmark Day 2 — game needs <2s for UX |

### Available models — confirmed Day 2 (Galileo testnet)

Empirical query via `broker.inference.listService()` returned 2 active providers:

| # | Provider Address | Model | Service | URL | Input price (wei/tok) | Output price (wei/tok) |
|---|---|---|---|---|---|---|
| 1 | `0xa48f01287233509FD694a22Bf840225062E67836` | **qwen/qwen-2.5-7b-instruct** | chatbot | compute-network-6.integratenetwork.work | 50,000,000,000 | 100,000,000,000 |
| 2 | `0x4b2a941929E39Adbea5316dDF2B9Bd8Ff3134389` | qwen/qwen-image-edit-2511 | image-editing | compute-network-17.integratenetwork.work | 0 | 5,000,000,000,000,000 |

**🎯 Production choice:** Provider #1 (Qwen 2.5 7B Instruct chatbot).

**Cost per match (estimate):**
- Input: ~100 tokens × 5e10 wei = 5e-6 0G ≈ negligible
- Output: ~50 tokens × 1e11 wei = 5e-6 0G ≈ negligible
- Per turn: ~1e-5 0G ≈ negligible
- Per match (8 turns): ~1e-4 0G ≈ negligible
- **Inference cost is essentially free per match. The 1 0G minimum is sub-account funding, not per-call cost.**

**Latency benchmarks (Day 2):**
- Broker init: ~1000ms (one-time)
- `listService()`: ~321ms
- `listServiceWithDetail()`: ~5770ms (slower — fetches health metrics)

**SDK gotcha:** ESM build of `@0gfoundation/0g-compute-ts-sdk@0.8.0` has a packaging bug (`./index-33b65b9f.js does not provide an export named 'C'`). **Workaround:** import via CommonJS (`require()`) or write integration scripts as `.cjs`. Main app (Next.js) bundling may not hit this; needs verification. — TODO: file issue with 0G team.

### Settlement (separate from verification)
- Fees accumulate per provider sub-account
- Settled on-chain in batches (delayed)
- Balance drops when batch settles — don't be surprised by lag

---

## 4. ERC-7857 INFT — "Agent ID" Standard

> **Note:** "Agent ID" in 0G's marketing materials = ERC-7857 INFT under the hood. Same thing, different name. Use ERC-7857 in code, "Agent ID" in pitch language for judge familiarity.

### Spec

ERC-7857 extends ERC-721 with 3 key functions:
| Function | Purpose |
|---|---|
| `transfer()` | Transfer with metadata re-encryption (oracle-mediated) |
| `clone()` | Create copy preserving metadata security |
| `authorizeUsage()` | Grant 3rd-party usage without ownership transfer (← bot rental for free) |

### Encryption flow

| Step | What happens |
|---|---|
| Generate | Owner generates symmetric key (HSM or local) |
| Encrypt | Bot prompt encrypted with AES-256-GCM |
| Seal | Symmetric key encrypted with owner's public key (RSA-4096 or ECC-P384) |
| Store | Encrypted bytes uploaded to 0G Storage, hash + URI saved |
| Mint | Contract stores `(tokenId, metadataHash, encryptedURI)` |

### Storage split

**On-chain (0G Chain):**
- Token ID + ownership
- Metadata hash (commitment)
- Encrypted URI (pointer to 0G Storage)
- Authorization mappings (who can use the bot)
- Oracle proofs from transfers

**Off-chain (0G Storage):**
- Encrypted bot system prompt
- Bot avatar/persona metadata
- (Optional) bot fine-tuning weights — N/A for us

### Transfer with re-encryption (TEE oracle path)

When INFT changes hands:
1. Sender sends encrypted data + key to TEE oracle
2. TEE decrypts in isolated env
3. TEE generates NEW symmetric key, re-encrypts
4. TEE seals new key with RECEIVER's public key
5. TEE outputs new sealed key + new hash
6. Contract validates hash, updates URI

This means: bot creator can sell their bot, new owner gets the prompt without seller having permanent access. Real ownership transfer.

### Mint code pattern (from docs)
```ts
const encrypted = await encryptMetadata(metadata, ownerPublicKey);
const storageResult = await ogStorage.store(encrypted, { redundancy: 3 });
// Returns: { uri, sealedKey, metadataHash, algorithm, version }

await contract.mint(ownerAddress, storageResult.uri, storageResult.metadataHash);
```

### Integration prerequisites (per docs)
- Node.js 16+
- Hardhat or Foundry
- 0G testnet account with tokens
- Storage + Compute API access keys

### Open questions
- ❓ Reference contract implementation — is there a public template, or do we write from scratch?
- ❓ Oracle service — does 0G run the TEE oracle, or do we self-host?
- ❓ Cost per mint (gas + storage)
  → **Action:** check Discord for ERC-7857 reference impl + oracle service

---

## 5. Persistent Memory & AI Alignment Nodes

### Persistent Memory ⏳
> Status: "Coming soon"

- **What it does:** persistent memory for AI agents across sessions
- **Why we care:** bot could "remember" players across matches — *"This bot recognizes you tried the math trick last time."*
- **Hackathon decision:** ❌ DO NOT implement (not available). ✅ DO sebut di pitch roadmap as Phase 4.

### AI Alignment Nodes ⏳
- **What it does:** monitors model drift, bias, anomalies on AI inference
- **Why we care:** anti-cheat for bot creators — detects if a bot is misbehaving / leaking signals
- **Hackathon decision:** ❌ DO NOT integrate (it's an ops infrastructure, not a per-app SDK). ✅ DO mention as roadmap.

---

## 6. Day 2 Action Items — Status

| # | Task | Status | Result |
|---|---|---|---|
| 1 | Install both SDKs | ✅ Done | Compute SDK 0.8.0 + Storage SDK 1.2.8 (CJS workaround for ESM bug) |
| 2 | Compute provider catalog query | ✅ Done | Qwen 2.5 7B Instruct selected (provider `0xa48f...`) |
| 3 | Storage upload+download roundtrip | ✅ Done | Works. 0.00125 0G/blob, 10.7s up / 1.8s down, integrity OK |
| 4 | Hardhat config for 0G networks | ✅ Done | `zeroGTestnet` (16602) + `zeroGMainnet` (16661) configured |
| 5 | Sanity deploy current contracts to Galileo | ✅ Done | OxHuman 0.0173 0G, HouseVault 0.0069 0G, EVM compat ✓ |
| 6 | Inference latency benchmark | ⏳ Gated | Needs ≥1 0G in wallet for sub-account funding |
| 7 | TEE attestation verification | ⏳ Gated | Same gate as #6 |
| 8 | Discord follow-ups (ERC-7857 ref, oracle, fine-tuning) | ⏳ Pending | Awaiting reply on faucet ticket; will ask in same thread |

### Mainnet deploy budget projection

Based on testnet gas measurements:
| Component | Estimated cost | Notes |
|---|---|---|
| Deploy `OxHuman.sol` | ~0.018 0G | Same complexity as Mantle ver |
| Deploy `BotINFT.sol` (new ERC-7857) | ~0.020-0.030 0G | Slightly bigger than HouseVault |
| Mint 5 personas | ~0.005-0.010 0G total | ERC-7857 mints may be more expensive than ERC-721 due to oracle setup |
| Initial HouseVault funding | n/a | Dropped from 0G arch |
| Test transactions (10-20) | ~0.05 0G | Stake + match + resolve cycles |
| **Mainnet total** | **~0.10-0.15 0G** | Comfortable budget |

### Galileo deployed addresses (sanity, throwaway)
- OxHuman: `0x062f1923Deb717A5d8D3e9Ed0e8C69b3eB63BC5f`
- HouseVault: `0x583904b082975E4cb4286611356718D7E76b7894`
- These are **for sanity test only** — final architecture will redeploy with `BotINFT` and dropped `HouseVault`.

---

## 7. Pitch Language Cheat Sheet (for demo video & X post)

Use these phrases, NOT others:

✅ **OK to say:**
- "TEE-attested inference, verifiable on-chain"
- "ZK-verifiable settlement layer for compute payments"
- "Encrypted AI metadata stored on 0G Storage"
- "Agent ID standard (ERC-7857) for tradable AI bots"
- "0G Chain — sub-second finality, full EVM compatibility"

❌ **Avoid (inaccurate):**
- "ZK-proof per AI inference response" (it's TEE)
- "Trustless inference" (TEE is hardware-trusted, not trustless)
- "Self-sovereign AI without any oracle" (transfers use oracle)

---

## 8. Source URLs Referenced

- [0G Docs Home](https://docs.0g.ai/)
- [Galileo Testnet Overview](https://docs.0g.ai/developer-hub/testnet/testnet-overview)
- [Mainnet Overview](https://docs.0g.ai/developer-hub/mainnet/mainnet-overview)
- [Storage SDK](https://docs.0g.ai/developer-hub/building-on-0g/storage/sdk)
- [Compute Inference](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/inference)
- [ERC-7857 Spec](https://docs.0g.ai/developer-hub/building-on-0g/inft/erc7857)
- [INFT Integration Guide](https://docs.0g.ai/developer-hub/building-on-0g/inft/integration)
- [Chain Architecture](https://docs.0g.ai/concepts/chain)
- [0G Discord (for unknowns)](https://discord.gg/0glabs)
