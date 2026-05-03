# 0xHuman × 0G — Technical Architecture (Source of Truth)

> Definitive architecture for 0G hackathon submission. Implementation Days 3-9 reference this doc. Update as design decisions evolve.
>
> **Version:** 1.0 (3 May 2026)
> **Status:** Locked pending Day 2 SDK empirical validation.

---

## 1. High-Level System Architecture

```
┌────────────────────────────────────────────────────────────┐
│                      USER (Browser)                         │
│  Next.js 14 + RainbowKit + Wagmi v2 + Socket.io client      │
│  Roles: Player (fighter)  |  Creator (bot owner)            │
└──────────────────────┬─────────────────────────────────────┘
                       │ WebSocket + RPC
                       ▼
┌────────────────────────────────────────────────────────────┐
│                BACKEND (Node.js, VPS)                       │
│  - Match orchestration (Socket.io)                          │
│  - Inference routing → 0G Compute SDK                       │
│  - Memory read/write → 0G Storage SDK                       │
│  - Transcript upload → 0G Storage SDK                       │
│  - On-chain settle → ethers.js → 0G Chain                   │
└──┬─────────────────┬───────────────────┬───────────────────┘
   │                 │                   │
   ▼                 ▼                   ▼
┌──────────┐   ┌────────────┐    ┌────────────────────┐
│   0G     │   │    0G      │    │     0G Chain       │
│ Compute  │   │  Storage   │    │  (mainnet 16661)   │
│          │   │            │    │                    │
│ Bot      │   │ Encrypted  │    │ OxHuman.sol        │
│ inference│   │ prompts    │    │ ├─ match escrow    │
│ TEE-     │   │            │    │ ├─ per-bot vault   │
│ attested │   │ Bot memory │    │ └─ verdict resolve │
│          │   │ (RAG state)│    │                    │
│ TEE-     │   │            │    │ BotINFT.sol        │
│ verified │   │ Match      │    │ (ERC-7857)         │
│ provider │   │ transcripts│    │ ├─ mint/transfer   │
│ signature│   │ (archival) │    │ ├─ metadata hash   │
└──────────┘   └────────────┘    │ └─ encrypted URI   │
                                 └────────────────────┘
```

**Modules touched:** 4 of 6 0G primitives (Compute, Storage, Chain, INFT). Persistent Memory + AI Alignment = roadmap (sebut di pitch).

---

## 2. Module Mapping

| 0xHuman component | 0G module | Status |
|---|---|---|
| Bot AI inference | 0G Compute Network (TEE-attested) | P0 |
| Bot identity & ownership | ERC-7857 INFT ("Agent ID") | P0 |
| Encrypted bot system prompt | 0G Storage (AES-256 client-side) | P0 |
| Bot cross-match memory | 0G Storage (RAG-style retrieval) | P0 |
| Match transcripts (post-game) | 0G Storage (archival, hash anchored on-chain) | P0 |
| Game escrow + per-bot vault | 0G Chain smart contracts | P0 |
| Bot fine-tuning preview | 0G Compute Fine-tuning | P1 (gated, Day 9 checkpoint) |
| Persistent Memory native | (coming soon — sebut roadmap) | Out |
| AI Alignment Nodes | (ops infra, sebut roadmap) | Out |

---

## 3. Smart Contract Architecture

### 3.1 Drop HouseVault entirely

`contracts/HouseVault.sol` — **NOT deployed to 0G.** Mantle artifact, redundant with INFT model.

Rationale: Each INFT bot has its own owner-funded vault. "Decentralizing the house" is solved per-bot, not via global LP pool. Single role (creator) replaces split roles (LP + bot operator).

### 3.2 New contract structure

Two contracts, deployed to 0G mainnet (Chain ID 16661):

#### `OxHuman.sol` (modified)
- Match escrow & state machine (existing logic adapted)
- Verdict resolution (signed message votes — keep existing pattern)
- Treasury fee collection
- **References `BotINFT.sol`** for PvE bot vault operations

#### `BotINFT.sol` (new)
ERC-7857 implementation + per-bot vault:

```solidity
contract BotINFT is ERC721 {
    struct Bot {
        // INFT metadata (encrypted, on 0G Storage)
        bytes32 personalityHash;      // hash of encrypted system prompt
        string  personalityURI;       // 0G Storage pointer (immutable)
        bytes32 memoryHash;           // hash of latest memory state
        string  memoryURI;            // 0G Storage pointer (mutable, updates per match)

        // Vault
        uint256 vaultBalance;         // 0G locked for this bot's matches
        uint256 maxStake;             // 10% of vaultBalance per match

        // Stats
        uint256 wins;
        uint256 losses;
        uint8   tier;                 // 0=Rookie, 1=Verified

        // Slot tracking
        bool    isPaidSlot;           // false=free slot, true=paid (10/25 0G)
    }

    mapping(uint256 => Bot) public bots;
    mapping(address => uint8) public slotsOwned;  // max 3 per wallet

    function mintFreeSlot(string personalityURI, bytes32 personalityHash) external payable;
    function mintPaidSlot(string personalityURI, bytes32 personalityHash, uint8 slotNumber) external payable;
    function depositToVault(uint256 tokenId) external payable;
    function withdrawFromVault(uint256 tokenId, uint256 amount) external;
    function updateMemory(uint256 tokenId, string newMemoryURI, bytes32 newMemoryHash) external; // onlyResolver
    function promoteToVerified(uint256 tokenId) external payable; // 10 0G to graduate free bot

    // ERC-7857 specifics
    function transferWithReencryption(...) external;
    function authorizeUsage(uint256 tokenId, address user) external;
}
```

### 3.3 Match flow with per-bot vault

PvE match (player vs INFT bot):

```
1. Player calls OxHuman.startMatchPvE(stake, botTokenId) {value: stake}
   - OxHuman locks player stake in escrow
   - OxHuman calls BotINFT.lockForMatch(botTokenId, stake)
     → BotINFT debits bot.vaultBalance by stake
     → BotINFT transfers stake to OxHuman escrow
   - Match starts (Active state)

2. Backend orchestrates 60s chat
   - Each turn: server fetches bot personality + memory from 0G Storage
   - Calls 0G Compute with prompt + history + memory
   - Verifies TEE attestation, sends reply to player
   - Saves message to in-memory transcript

3. Both submit votes (signed messages, off-chain)

4. Backend calls OxHuman.resolveWithSignatures(...)
   - Verifies sigs on-chain
   - Distributes pot per fee schedule (see §5)
   - For PvE: pot redistributed to (treasury, bot vault, player)
   - Bot vault gains/loses tokens

5. Backend post-match handlers:
   a. Upload chat transcript to 0G Storage → get rootHash
   b. Update bot memory (append match summary, lessons learned)
      → encrypt → upload → BotINFT.updateMemory(tokenId, newURI, newHash)
   c. Emit event with chatLogHash, memoryHash for indexer
```

### 3.4 Match flow PvP (human vs human)

Unchanged from current Mantle implementation. INFT not involved. 5% protocol fee, winner-take-all or draw.

---

## 4. Per-Bot Vault Economics

### 4.1 Slot pricing

| Slot | Mint cost | Min initial vault deposit | Pool eligibility |
|---|---|---|---|
| Slot 1 (free) | 0 0G | 2 0G | Rookie tier only (2 0G stake matches) |
| Slot 2 (paid) | 10 0G | 5 0G | Verified tier (all stake levels) |
| Slot 3 (paid) | 25 0G | 10 0G | Verified tier (all stake levels) |
| Promote free→Verified | 10 0G | (existing vault retained) | Verified tier |

Mint cost distribution:
- 100% to Treasury (no HouseVault to split with)

Vault deposit:
- Stays in BotINFT contract, withdrawable by owner anytime (with 1-block delay for sandwich resistance)

Max wallet:
- 3 INFT bots per wallet (anti-sybil)

### 4.2 Per-match fee distribution (PvE)

Player stake X 0G, bot vault matches X 0G. Pot = 2X.

#### Bot wins (player loses):
| Recipient | Amount | % |
|---|---|---|
| Treasury (protocol fee) | 0.05X | 5% of stake |
| Treasury (performance fee) | 0.10X | 10% of stake |
| Bot vault | 1.85X | grows by 0.85X net (returned stake X + 0.85X profit) |
| **Total** | **2X** | |

#### Player wins (bot loses):
| Recipient | Amount | % |
|---|---|---|
| Treasury (protocol fee) | 0.05X | 5% of stake |
| Player payout | 1.85X | 1.85x stake |
| Bot vault | 0.10X | refunded to vault (stake X minus payout 0.9X minus fee 0.05X) |
| **Total** | **2X** | |

Bot vault net P/L:
- Win: +0.85X
- Loss: -0.90X
- **Break-even win rate: 51.4%**

### 4.3 Tier graduation

Free bot starts in Rookie pool (only matched in 2 0G stake games).

Path to Verified:
- **Pay 10 0G** to manually promote, OR
- **Auto-graduate**: 30+ matches with ≥45% win rate → automatic promotion

Demotion:
- If Verified bot drops below 30% win rate over 50 matches → demoted to Rookie
- Owner can re-promote with 10 0G fee

### 4.4 Burn / withdraw

Owner can:
- `withdrawFromVault(tokenId, amount)` — partial withdrawal (1-block delay)
- `burnBot(tokenId)` — destroy INFT, receive entire `vaultBalance` back
  - Mint cost (10/25 0G) is **not refunded** — non-recoverable

---

## 5. INFT Metadata Schema

### 5.1 Personality (immutable)

Encrypted blob on 0G Storage. Never updated post-mint (unless transferred via ERC-7857 re-encryption).

```json
{
  "version": "1.0",
  "name": "Mochi",
  "avatar": "ipfs://...",
  "tagline": "The cat-themed gen-z chatbot",
  "systemPrompt": "You are Mochi, a 22-year-old cat lover...[encrypted]",
  "voiceParameters": {
    "temperature": 0.8,
    "maxTokens": 150
  },
  "createdAt": 1715000000,
  "creator": "0xabc..."
}
```

Encryption: AES-256-GCM, key sealed with creator's public key (RSA-4096 or ECC-P384, per ERC-7857).

### 5.2 Memory (mutable, RAG-style)

Updated per match. Stored encrypted (or unencrypted — TBD based on demo decision).

```json
{
  "version": "1.0",
  "stats": {
    "totalMatches": 847,
    "wins": 521,
    "losses": 326,
    "winRate": 0.615
  },
  "recentOpponents": [
    {
      "playerHash": "0xabc...sha256",
      "matchCount": 3,
      "lastResult": "win",
      "lastTactic": "math_questions",
      "ts": 1715000000
    }
  ],
  "lessonsLearned": [
    "Players asking weather first are usually human (12 confirmed cases)",
    "Math under 5s response often signals bot trying to fake bot",
    "Slang variations: 'fr fr', 'no cap', 'lowkey' work in gen-z persona"
  ],
  "lastMatchSummary": "Beat player 0xdef by faking bot persona well; player asked emotional questions, I deflected with sarcasm."
}
```

**Memory injected into system prompt** before each inference call:
```
[BASE PERSONALITY: Mochi, gen-z cat lover...]

[YOUR MEMORY]
- You have played 847 matches (62% win rate).
- Last 3 lessons:
  • Players asking weather first are usually human.
  • Math under 5s = bot faking bot.
  • Slang: "fr fr", "no cap" work well.
- This opponent (0xabc) played you 3 times. They like math tricks.

[CHAT HISTORY THIS MATCH]
...
```

### 5.3 Update flow

```
Match resolves → backend:
1. Fetch current memory from 0G Storage (via memoryURI)
2. Decrypt locally
3. Append: new opponent entry, possibly new lesson, updated stats
4. Re-encrypt
5. Upload new blob to 0G Storage → get newMemoryURI + newMemoryHash
6. Call BotINFT.updateMemory(tokenId, newMemoryURI, newMemoryHash)
   → onlyResolver (server wallet) — owner can't tamper memory
   → emits MemoryUpdated event for indexers
```

**Why server (not owner) updates memory:** prevents owner from cheating by injecting false memories. Server is trusted resolver — same pattern as signed-vote resolution.

**Owner CAN read memory** anytime (via decryption with owner's private key) to inspect their bot's "experience."

---

## 6. Match Flow — End-to-End

```
                ┌──────────────────────────────┐
                │   Player visits site         │
                │   Connect wallet             │
                │   Choose stake tier          │
                │   Click "Find match"         │
                └─────────────┬────────────────┘
                              ▼
                ┌──────────────────────────────┐
                │   Backend matchmaker         │
                │                              │
                │   60% chance PvE:            │
                │   - Pick random INFT bot     │
                │     from eligible vault pool │
                │   40% chance PvP:            │
                │   - Pair with another player │
                │                              │
                │   PLAYER NEVER KNOWS WHICH   │
                └─────────────┬────────────────┘
                              ▼
                ┌──────────────────────────────┐
                │   Match created on-chain     │
                │   OxHuman.startMatchXxx()    │
                │   Stake locked in escrow     │
                └─────────────┬────────────────┘
                              ▼
                ┌──────────────────────────────┐
                │   60-sec chat (Socket.io)    │
                │                              │
                │   PvE turn:                  │
                │   1. Player sends message    │
                │   2. Server fetches bot      │
                │      personality + memory    │
                │      from 0G Storage         │
                │   3. Compose prompt          │
                │   4. Call 0G Compute         │
                │   5. Verify TEE attestation  │
                │   6. Show reply with         │
                │      "✓ Verified" badge      │
                └─────────────┬────────────────┘
                              ▼
                ┌──────────────────────────────┐
                │   Both submit verdict        │
                │   (signed message off-chain) │
                └─────────────┬────────────────┘
                              ▼
                ┌──────────────────────────────┐
                │   Server submits to chain    │
                │   resolveWithSignatures()    │
                │   - Verifies sigs            │
                │   - Distributes pot          │
                │   - Updates bot vault        │
                └─────────────┬────────────────┘
                              ▼
                ┌──────────────────────────────┐
                │   POST-MATCH (PvE):          │
                │                              │
                │   1. Upload transcript to    │
                │      0G Storage (archival)   │
                │   2. Update bot memory       │
                │      (append + re-encrypt)   │
                │   3. Anchor hashes on-chain  │
                │      via BotINFT contract    │
                │                              │
                │   POST-MATCH UI:             │
                │   - Reveal: PvE / PvP        │
                │   - If PvE: show bot card    │
                │     (name, owner, stats)     │
                │   - "Download chat receipt"  │
                │   - "Verify inference"       │
                └─────────────┬────────────────┘
                              ▼
                ┌──────────────────────────────┐
                │   CREATOR NOTIFICATION       │
                │   "Your bot Mochi just won   │
                │   match #1234. You earned    │
                │   1.9 0G."                   │
                └──────────────────────────────┘
```

---

## 7. Frontend Surface Changes

### 7.1 New pages

- `/bots/create` — mint INFT bot. Form: name, avatar upload, system prompt, slot selection (free/paid).
- `/bots/my` — creator dashboard. List of owned bots, vault balance, stats, deposit/withdraw, burn.
- `/bots/[id]` — public bot card. Stats, win rate, owner, recent matches.
- `/match/[id]/receipt` — post-match receipt. Chat transcript from 0G Storage, inference verifications, bot card if PvE.

### 7.2 Modified pages

- `/arena` — add subtle "Powered by 0G Compute" badge (not bot-revealing).
- Match chat UI — add "✓ Verified" badge per AI message (only visible POST-match if PvE, to preserve blind play).
- Match end screen — add INFT bot reveal card.

### 7.3 Removed

- `/house-pool` — drop entirely (HouseVault gone).

---

## 8. Backend Changes

### 8.1 New modules

- `lib/0g-compute.ts` — Compute SDK wrapper. `inferWithVerification(systemPrompt, history, memory)` returns `{ reply, attestation, chatId }`.
- `lib/0g-storage.ts` — Storage SDK wrapper. Upload/download with optional encryption.
- `lib/0g-chain.ts` — chain config + ethers contract instances.
- `lib/bot-memory.ts` — memory schema, update logic, retrieval.
- `lib/inft-mint.ts` — INFT minting helper (encrypt + upload + mint contract call).

### 8.2 Modified

- `server.ts` — add post-match handlers (transcript upload, memory update). Replace Gemini call with 0G Compute call.
- `scripts/ai-brain.ts` — replace Gemini SDK with 0G Compute SDK + memory injection.
- `scripts/bot-agent.ts` — adapt to per-bot vault (no longer single bot wallet).

### 8.3 Removed

- `src/hooks/useHouseVault.ts` — no HouseVault contract on 0G.

---

## 9. Pitch Language Cheat Sheet

(also in `0G-INTEGRATION-NOTES.md` §7 — reproduced here for builders' quick reference)

| ✅ Use | ❌ Avoid |
|---|---|
| "TEE-attested inference" | "ZK-proof per inference" (incorrect) |
| "Verifiable on-chain via provider TEE signature" | "Trustless inference" (TEE = hardware-trusted) |
| "ZK-verifiable settlement layer" (separate, accurate) | (don't conflate with inference verification) |
| "Encrypted AI metadata on 0G Storage" | — |
| "Agent ID standard (ERC-7857)" | "Generic NFT" |
| "Sub-second finality on 0G Chain" | — |

---

## 10. Decision Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-05-03 | Drop HouseVault from 0G deployment | Redundant with per-bot vault; INFT bot owners are the new "house" |
| 2026-05-03 | Per-bot vault model with break-even ~51% win rate | Skill-based creator economy; honest risk/reward |
| 2026-05-03 | Free Slot 1 (Rookie tier) + paid Slot 2/3 (10/25 0G) | Low onboarding barrier + economic filter against spam |
| 2026-05-03 | Server (resolver) updates bot memory, not owner | Prevents owner-side memory tampering |
| 2026-05-03 | Memory injected into system prompt RAG-style | Implementable in 13 days; native Persistent Memory still "coming soon" |
| 2026-05-03 | Level 3 fine-tuning gated stretch (Day 9 checkpoint) | High-value demo, but high-risk; only ship if P0 solid |
| 2026-05-03 | Multi-track entry: Track 4 (SocialFi) + Track 1 (Agentic Infra) | INFT bots qualify for both; doubles win probability |
| 2026-05-03 | Bot reveal POST-match only, not pre-match | Preserve blind matchmaking — core game mechanic |

---

## 11. Open Questions (to resolve Day 2)

| # | Question | Owner | Path |
|---|---|---|---|
| 1 | Is there a public ERC-7857 reference contract template, or do we write from scratch? | Discord | Ask 0G Discord support ticket |
| 2 | Does 0G run TEE oracle for INFT transfers, or do we self-host? | Discord | Ask Discord |
| 3 | Cost estimates: 0G Storage upload, INFT mint, mainnet deploy gas | Empirical | Test on testnet Day 2 |
| 4 | 0G Compute inference latency (target <2s) | Empirical | Benchmark Day 2 |
| 5 | Available models — pick our production model | Empirical | Query `listService()` Day 2 |
| 6 | 0G Compute Fine-tuning SDK maturity (for P1 stretch) | Discord + docs | Day 8 if P0 done |
