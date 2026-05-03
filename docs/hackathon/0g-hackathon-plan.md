# 0xHuman × 0G APAC Hackathon — Master Plan

> **Goal:** Submit 0xHuman ke 0G APAC Hackathon dengan integration yang solid, demo crisp, dan story yang nyetel sama thesis 0G (verifiable AI). Deadline: **16 Mei 2026, 23:59 UTC+8**.
>
> **Today:** 3 Mei 2026 → **13 hari tersisa**.

---

## ⚠️ v2 Updates — 3 Mei 2026 (Day 1 close)

Plan original perlu beberapa adjustment material setelah Day 1 SDK research + design discussion. Source of truth untuk arsitektur teknis sekarang ada di **[`0G-ARCHITECTURE.md`](./0G-ARCHITECTURE.md)**. Findings SDK ada di **[`0G-INTEGRATION-NOTES.md`](./0G-INTEGRATION-NOTES.md)**.

**Key decision changes vs draft awal:**

| Topic | Original draft | v2 (locked) | Why |
|---|---|---|---|
| INFT scope | Out (drop ke roadmap) | **In, sebagai P0** | Tanpa INFT bot, gameplay-nya gak berubah dari Mantle. INFT kasih bot identity + creator economy = real differentiator |
| HouseVault | Deploy ke 0G mainnet | **Drop entirely** | Per-bot vault model lewat INFT redundant-kan global LP pool |
| Bot memory | Out of scope | **Level 2 RAG memory P0** + Level 3 fine-tuning gated stretch | "Bot getting smarter" angle = killer pitch. Doable via 0G Storage tanpa Persistent Memory native |
| Pitch language | "ZK-verifiable inference" | **"TEE-attested inference"** | SDK reality: inference verification adalah TEE signature. ZK-verifiable = settlement layer, beda hal |
| Track submission | Track 4 only | **Track 4 (primary) + Track 1 (Agentic Infra)** | INFT bot persona qualify untuk Track 1. Multi-track = 2x win surface |
| Slot economics | Flat mint fee | **Free Slot 1 (Rookie tier) + paid 10/25 0G Slot 2/3** | Low onboarding barrier + economic spam filter via tier graduation |

Detail lengkap masing-masing: lihat `0G-ARCHITECTURE.md`. Section di bawah sini di-mark "[OUTDATED]" kalau di-supersede.

---

## TL;DR

0xHuman = Turing Test betting game di [0xhuman.fun](https://0xhuman.fun). Sebelumnya submit ke Mantle, kalah. Sekarang re-submit ke 0G dengan angle yang **fundamentally lebih kuat**: verifiable AI inference adalah *requirement*, bukan optional. Tanpa 0G, game-nya gak bisa scale ke real money karena trust assumption-nya hancur.

**4 thing yang harus jalan supaya pitch ini menang (v2):**
1. AI inference di-route via **0G Compute** dengan TEE attestation
2. Chat log + bot memory auto-pinned ke **0G Storage** (encrypted untuk bot prompts)
3. `OxHuman.sol` + `BotINFT.sol` (ERC-7857) deployed ke **0G mainnet**
4. Per-bot vault economics: creator mint INFT bot, earn passive dari menang-nya bot

**Yang di-drop:** HouseVault dari scope (redundant dengan per-bot vault). INFT *back in scope* — itu yang bikin 0xHuman bukan sekedar Mantle yang dipindah ke 0G.

---

## 1. Why Re-submit ke 0G

### Why this fits 0G better than Mantle

Di Mantle, 0xHuman = "DeFi game pakai AI." Lu kompetisi sama project DeFi murni dengan TVL story.

Di 0G, 0xHuman = **showcase verifiable AI** yang kebetulan bentuknya game. Itu literally central thesis-nya 0G. Track 4 (Web 4.0 Open Innovation — Gaming/SocialFi) emang ada dan **kompetisinya less saturated** dibanding track trading/agent infra.

### Why it passes the 0G-necessity litmus test

Cek lakmus utama: **"kalau 0G dicabut, apa yang rusak?"**

| Tanpa 0G | Yang Rusak |
|---|---|
| Tanpa verifiable inference | Player gak bisa percaya bot beneran AI bukan operator |
| Tanpa immutable chat log | Dispute resolution mustahil |
| Tanpa on-chain anchoring | Audit trail rapuh, gampang dimanipulasi |

Tanpa 0G, 0xHuman = judi kasino tanpa house yang bisa diaudit. Gak survive trust assumption-nya.

**Ini differentiator gede dari project gallery 0G yang lain** — banyak yang "nempel" 0G secara cosmetic. 0xHuman struktural butuh 0G.

### Why it fits user signal (playful, consumer, viral)

- **Playful** ✅ "Spot the Bot. Fake the Soul. Take the Pot."
- **Consumer** ✅ End user main langsung di browser, bukan B2B/dev tools
- **Viral** ✅ Format perfect TikTok/Twitter — screenshot moment "ditipu AI" / "nipu manusia kira gua bot"
- **Edukatif soal 0G** ✅ Tiap match, badge "✓ Verified via 0G Compute" exposes user ke 0G tanpa lecture

---

## 2. Submission Requirements 0G — Checklist

Gak boleh miss satupun:

- [ ] **Project name + 1-sentence description** (≤30 words)
- [ ] **Public GitHub repo** dengan substantial commits selama hackathon period (3-16 Mei)
- [ ] **0G mainnet contract address** (BUKAN testnet) + 0G Explorer link
- [ ] **Demo video ≤3 menit** — show product flow + 0G integration *actually used*
- [ ] **README** lengkap: overview, architecture, 0G modules used, deployment steps, test instructions
- [ ] **Public X post** dengan:
  - Project name
  - Demo screenshot/clip
  - Hashtags: `#0GHackathon` `#BuildOn0G`
  - Tags: `@0G_labs` `@0g_CN` `@0g_Eco` `@HackQuest_`
- [ ] **Submit lewat HackQuest** sebelum 16 Mei 23:59 UTC+8

**Optional (bonus):** pitch deck, frontend demo link, technical write-up tentang 0G integration, user testing notes.

---

## 3. Scope Lock — Apa yang Dikerjakan vs Tidak (v2)

### ✅ IN scope — P0 (must ship perfect)

| Component | Why |
|---|---|
| **Phase A: Gemini → 0G Compute (TEE-attested)** | Core thesis. Tiap bot reply ada verification signature. |
| **Phase B: Chat transcripts → 0G Storage** | Match receipts, dispute-ready, demo-able. |
| **Phase C: BotINFT (ERC-7857) on 0G Chain** | Bot persona = tradable INFT, encrypted prompt di 0G Storage. **In scope di v2** — gameplay differentiator. |
| **Phase D: Per-bot vault economics** | Drop HouseVault. Creator deposit modal sendiri, earn dari menang. |
| **Phase E: Level 2 memory (RAG)** | Bot inget pertarungan & opponent sebelumnya, makin pinter over time. Implemented via 0G Storage. |
| **Phase F: 0G mainnet deploy** | Submission requirement. |
| **Frontend: "✓ Verified" badge + bot card reveal + creator dashboard** | UX yang bikin 0G integration *visible*. Demo-grade polish. |
| **Demo video 3 menit cinematic** | Day 11-12 dedicated. Pelajaran dari Mantle: polish bukan afterthought. |
| **README + architecture diagram + pitch deck** | Judging criterion explicit + extras. |
| **Multi-track submission**: Track 4 + Track 1 | INFT qualify untuk both. 2x surface area. |

### 🟡 IN scope — P1 (gated stretch, Day 9 checkpoint)

| Component | Trigger | Fallback |
|---|---|---|
| **Level 3 fine-tuning preview** (1 bot, 1 fine-tune run via 0G Compute Fine-tuning) | Day 9: P0 must be 100% solid | Skip → mention as Phase 5 roadmap |

### ❌ OUT of scope (cut atau move ke roadmap)

| Component | Reason |
|---|---|
| **HouseVault deployment ke 0G** | Redundant dengan per-bot vault dari INFT |
| **EXP/Leaderboard migrate ke 0G Storage** | Overkill. PostgreSQL aman. |
| **Full bot marketplace UI** (transferable trading, secondary market) | Phase 4 stuff. INFT tetep deployable, marketplace UI cuma extra. |
| **Multi-chain dual deployment (Mantle + 0G)** | 0G mainnet only untuk submission. |
| **Persistent Memory native (0G upcoming)** | Coming soon dari 0G — wait. Sebut di pitch roadmap. |
| **AI Alignment Nodes integration** | Ops infra, sebut di pitch roadmap. |
| **Custom bot prompt UI for end-users** | Untuk hackathon: 5 hand-crafted bots di-mint by team. User-mint = post-hackathon. |

### ⚠️ DEPENDS on Day 2 empirical finding

| Component | Decision criteria |
|---|---|
| **Memory encryption** | Encrypted (extra security) atau plaintext (simpler demo)? Decide based on 0G Storage encryption SDK behavior |
| **ERC-7857 implementation source** | Public reference template (per Discord answer) atau write from scratch? |

---

## 4. 13-Day Execution Plan (v2)

### ✅ Hari 1: Foundation + De-risk (3 Mei) — **COMPLETED**

- [x] Branch `0g-integration` created
- [x] Master plan moved ke repo
- [x] Obsolete pitch file dropped
- [x] 0G SDK research complete (`0G-INTEGRATION-NOTES.md`)
- [x] Architecture v2 locked (`0G-ARCHITECTURE.md`)
- [x] Mantle retrospective drafted (`RETROSPECTIVE-MANTLE.md`)
- [x] Plan v2 update (this commit)
- [x] Discord faucet ticket submitted (waiting on 0G team)

**Outputs:** 4 docs in `docs/hackathon/`. Branch ready. ⚠ blocked on faucet allocation untuk Day 2 testing.

---

### 🔬 Hari 2: SDK Empirical Validation (4 Mei)

**Goal:** Confirm SDK assumptions dari Day 1 docs research dengan real testnet calls.

- [ ] **Install both SDKs** dalam fresh sandbox project: `@0gfoundation/0g-compute-ts-sdk`, `@0gfoundation/0g-storage-ts-sdk`
- [ ] **Run hello-world inference** via 0G Compute — `chat/completions` call dengan provider catalog
  - Verify TEE attestation via `processResponse(providerAddress, chatID)`
  - **Benchmark latency** target <2s
  - Document chosen provider address + model name
- [ ] **Run hello-world Storage upload** — JSON blob dengan `MemData`, then `downloadToBlob` round-trip
  - Test encryption (AES-256 client-side)
  - Document costs observed
- [ ] **Deploy minimal `OxHuman.sol` (current Mantle version)** ke Galileo testnet
  - Confirm zero-rewrite EVM compat
  - Document gas costs
- [ ] **Discord follow-up** untuk open questions:
  - ERC-7857 reference contract (template available?)
  - TEE oracle service (self-host atau 0G provided?)
  - Storage cost per upload

**Outputs:** SDK sandbox repo, 1 contract on Galileo, latency + cost numbers logged in `0G-INTEGRATION-NOTES.md` §6 action items.

**Day 2 checkpoint:** Kalau salah satu SDK gak responsive atau latency >5s, **stop dan re-evaluate scope**. Jangan masuk implementation phase tanpa konfirmasi.

---

### 🛠️ Hari 3-4: 0G Compute Integration (5-6 Mei)

**Goal:** Bot inference fully on 0G Compute, dengan TEE verification visible to user.

- [ ] **Create `lib/0g-compute.ts`** — SDK wrapper. `inferWithVerification(systemPrompt, messages)` returns `{ reply, attestation, chatId, providerAddress }`
- [ ] **Refactor `scripts/ai-brain.ts`** — replace Gemini API call dengan 0G Compute call
- [ ] **Update `scripts/bot-agent.ts`** — adapt response handling, store attestation per turn
- [ ] **Frontend: `<InferenceBadge>` component** — "✓ Verified" badge di chat bubbles (visible POST-match only untuk preserve blind play)
- [ ] **Frontend: verify modal** — click badge → show provider address + chatID + on-chain verify button
- [ ] **Test E2E** — full PvE match dengan 0G Compute providing replies

**Outputs:** Bot 100% running on 0G Compute. Inference verifications captured per turn. Verify modal works.

---

### 💾 Hari 5: 0G Storage Integration (7 Mei)

**Goal:** Chat transcripts archival + bot personality/memory storage.

- [ ] **Create `lib/0g-storage.ts`** — Storage SDK wrapper with encrypt/decrypt helpers
- [ ] **Backend: post-match handler**
  - Serialize chat transcript JSON
  - Upload (unencrypted) ke 0G Storage Log layer
  - Save rootHash for on-chain anchoring
- [ ] **Backend: bot personality upload helper** — encrypt with AES-256, upload, return URI + hash
- [ ] **Backend: memory read/write helpers** — fetch + decrypt + append + re-encrypt + re-upload
- [ ] **Frontend: `<MatchReceipt>` page** — fetch transcript from Storage, show diff vs on-chain hash
- [ ] **Test E2E** — match → transcript uploaded → receipt page reads back successfully

**Outputs:** Match transcript flow works. Bot personality + memory storage primitives ready.

---

### 📜 Hari 6-7: BotINFT Contract + Per-Bot Vault (8-9 Mei)

**Goal:** ERC-7857 BotINFT contract deployed dengan per-bot vault economics. Replace HouseVault.

- [ ] **Write `contracts/BotINFT.sol`** — ERC-7857 + vault per token (ref `0G-ARCHITECTURE.md` §3.2)
  - Mint free slot (Rookie tier)
  - Mint paid slot 2/3 (10/25 0G)
  - `depositToVault`, `withdrawFromVault`, `burnBot`
  - `updateMemory` (onlyResolver)
  - `transferWithReencryption` (ERC-7857 standard)
- [ ] **Refactor `contracts/OxHuman.sol`** — adapt PvE flow ke per-bot vault
  - `startMatchPvE(stake, botTokenId)` — locks both player stake + bot vault
  - Update `_resolveVsHouse` → `_resolveVsBot` (uses bot vault, not HouseVault)
  - Drop HouseVault dependency entirely
- [ ] **Drop `contracts/HouseVault.sol`** dari deployment script
- [ ] **Mint script: 5 hand-crafted bot personas** — Mochi, Skibidi, Hacker, Grandma, Edgy Teen
  - Each: encrypt prompt, upload to Storage, mint on-chain via team wallet
- [ ] **Test E2E on Galileo** — full PvE match dengan random INFT bot, vault P/L correct

**Outputs:** 2 contracts on Galileo. 5 personas minted. Per-match flow validates.

---

### 🎨 Hari 8: Frontend (Creator + Match Receipt + Memory) (10 Mei)

**Goal:** All UX surfaces ready untuk demo.

- [ ] **`/bots/create`** — mint INFT form (name, avatar, prompt, slot select)
- [ ] **`/bots/my`** — creator dashboard. Bot cards, vault balance, stats, deposit/withdraw, burn
- [ ] **`/bots/[id]`** — public bot card page (stats, recent matches, owner)
- [ ] **Post-match reveal screen** — bot card with "Defeated by Mochi (owned by @x)" narrative + memory display
- [ ] **Drop `/house-pool` page** entirely
- [ ] **Backend: memory injection in inference call** — RAG-style prepend to system prompt
- [ ] **Test E2E** — mint bot → match runs → memory visibly updated in bot card

**Outputs:** All pages functional. Memory updates visible after match (creator sees "+1 win, +1 lesson learned").

---

### 🚀 Hari 9: Mainnet Deploy + Day 9 Checkpoint (11 Mei)

**Goal:** Production deploy 0G mainnet. **Critical checkpoint** untuk decide Level 3 fine-tuning.

- [ ] **Pre-deploy checklist:** gas estimates, constructor params, owner/resolver addresses
- [ ] **Deploy `OxHuman.sol` + `BotINFT.sol`** ke 0G mainnet (Chain ID 16661)
- [ ] **Verify contracts on chainscan.0g.ai**
- [ ] **Update frontend config** — RPC, chain ID, contract addresses, RainbowKit/Wagmi
- [ ] **Mint 5 personas on mainnet**
- [ ] **Mainnet smoke test** — connect → stake → match → vote → resolve → memory update
- [ ] **🚦 Day 9 Decision Point:** Apakah Level 3 fine-tuning preview di-attempt?
  - **GO:** Kalau P0 100% solid, fine-tuning SDK reachable, ada 100+ test transcripts terkumpul
  - **NO-GO:** Kalau ada masalah di P0 atau resource tipis. Skip → mention as Phase 5 roadmap.

**Outputs:** 0xHuman live on 0G mainnet. Contract addresses + Explorer links recorded for submission.

---

### ✨ Hari 10: Polish + Bug Bash (12 Mei)

**Goal:** Demo-quality UX. No janky moments selama recording.

- [ ] **UX polish:**
  - Loading states (inference, storage upload, on-chain settle)
  - Error handling (RPC failures, storage timeout, etc)
  - Toast notifications
  - Mobile responsive (kalau judges buka dari HP)
- [ ] **Visual polish:**
  - 0G branding di footer
  - "Powered by 0G" badges
  - "Verified inference" animation (subtle)
- [ ] **Bug bash session:**
  - Play 10 matches end-to-end
  - List semua jankiness
  - Fix top 5
- [ ] **Performance:**
  - Inference response <2s
  - Page load <3s
  - Avoid blocking UI saat upload to Storage (background)

**Output hari 10:**
- App stable di mainnet
- E2E flow smooth tanpa drop
- Ready buat recording

---

### 🎬 Hari 11-12: Demo Video + Submission Materials (13-14 Mei)

**Goal:** Demo video cinematic + semua materi submission ready. Pelajaran Mantle: ini yang ngalahin lu, jangan dianggap afterthought.

- [ ] **Demo video script (3 menit, lead with emotional hook NOT tech):**
  - **0:00-0:20** — Cold open: cinematic match. Player chat 60 detik. Voting. Reveal: *"You just lost to Mochi — owned by @creator. They earned 1.9 0G."* Black screen, title card.
  - **0:20-0:50** — Switch perspective: creator side. *"This is Mochi. I built this AI bot 30 days ago. Today it's earned me X 0G passively."* Show creator dashboard.
  - **0:50-1:30** — How 0G makes this possible. Quick visual tour:
    - Bot reply → "✓ Verified" badge → 0G Compute (TEE-attested)
    - Match ended → chat receipt on 0G Storage (URL clickable)
    - Bot identity → INFT on 0G Chain (clickable to Explorer)
    - Bot memory → updated each match (RAG-style, decryptable by owner)
  - **1:30-2:15** — Why 0G is necessary (not optional): 3 trust gaps without 0G — centralized AI = no trust, centralized chat = no dispute, centralized bot = no ownership. *Show what each module solves.*
  - **2:15-2:45** — Roadmap reveal: Persistent Memory (coming), Fine-tuning, Marketplace, Cross-language. *"This is the foundation."*
  - **2:45-3:00** — Outro: tagline, CTA, tag handles.
- [ ] **Cinematic match recording** — bukan record diri sendiri main solo. Hire 2 friends, record 1 match dramatic (ada plot twist). Cut bagus.
- [ ] **Edit + captions** — captions wajib (judges non-Indonesian). Music subtle. Smooth transitions.
- [ ] **Upload ke YouTube/Loom** — public link, unlisted OK
- [ ] **README rewrite** untuk 0G submission:
  - Hero section dengan demo GIF
  - Quick start (clone, install, run)
  - Architecture diagram (mermaid atau image)
  - 0G modules used + how
  - Contract addresses + Explorer links
  - Mantle origins note (transparency: "originally on Mantle, redesigned for 0G's verifiable AI thesis")
- [ ] **Architecture diagram** — Excalidraw/Figma:
  - User → Frontend → Backend → Compute / Storage / Chain / INFT
  - Highlight 4 0G modules
- [ ] **Pitch deck (8-12 slides PDF):**
  - Problem (3 trust gaps)
  - Solution (4 0G modules mapped)
  - Demo screenshots (cinematic moments)
  - Architecture
  - Tech stack
  - Roadmap (Phase 4 + Phase 5)
  - Team
  - Live URL + repo
- [ ] **X post drafts (2 versions):**

  **Primary (Track 4 angle):**
  ```
  We built 0xHuman: a Turing Test betting game where verifiable AI is
  the gameplay, not the gimmick.

  Mint your AI bot. Earn when it tricks humans. Lose when it gets caught.

  Powered by @0G_labs Compute (TEE-attested inference), Storage (encrypted
  prompts and chat receipts), Chain (game escrow), and Agent ID (ERC-7857).

  Spot the bot. Fake the soul. Take the pot.

  [demo clip]

  Try it: 0xhuman.fun
  #0GHackathon #BuildOn0G @0g_CN @0g_Eco @HackQuest_
  ```

  **Secondary (Track 1 — Agentic Infra angle):**
  ```
  What if every AI agent had a vault, a memory, and an owner who earned
  from its performance?

  We built 0xHuman to find out. AI bots as ERC-7857 INFTs on @0G_labs.
  Each bot is a tradable agent with encrypted prompts (0G Storage),
  verifiable inference (0G Compute TEE), and a per-bot vault (0G Chain).

  This is what agent infrastructure looks like.

  [demo clip]

  #0GHackathon #BuildOn0G @0g_CN @0g_Eco @HackQuest_
  ```

**Output hari 12:**
- Demo video uploaded (≤3 min, captions, polished)
- README rewritten
- Pitch deck PDF ready
- 2 X post drafts ready

---

### 📤 Hari 13: Buffer + Submit (15-16 Mei)

**Goal:** Submit dengan tenang, gak last-minute panic.

- [ ] **Final smoke test** — full E2E run di mainnet, record screen as backup demo
- [ ] **Last bug fixes** (kalau ada)
- [ ] **Submit via HackQuest:**
  - Project info
  - GitHub repo link
  - 0G mainnet contract addresses
  - 0G Explorer links
  - Demo video URL
  - README link
  - Pitch deck (optional)
- [ ] **Publish X post** dengan semua tags & hashtags
- [ ] **Submit X post link** ke HackQuest
- [ ] **Cross-check submission requirements** — semua centang
- [ ] **Submit**

---

## 5. Technical Architecture (Target State) [SUPERSEDED]

> **⚠️ This section is superseded by [`0G-ARCHITECTURE.md`](./0G-ARCHITECTURE.md).** The diagram below is an outdated v1 snapshot — refer to the architecture doc for current source of truth (per-bot vault, BotINFT contract, memory schema, etc).

---

## 6. Files to Create / Modify (v2)

### New files
- ✅ `docs/hackathon/RETROSPECTIVE-MANTLE.md` — what failed, lessons applied
- ✅ `docs/hackathon/0G-INTEGRATION-NOTES.md` — SDK findings + reality check
- ✅ `docs/hackathon/0G-ARCHITECTURE.md` — source of truth for tech architecture
- `lib/0g-compute.ts` — Compute SDK wrapper with TEE verification
- `lib/0g-storage.ts` — Storage SDK wrapper with encrypt/decrypt helpers
- `lib/0g-chain.ts` — chain config (mainnet 16661 + testnet 16602)
- `lib/bot-memory.ts` — memory schema + RAG injection logic
- `lib/inft-mint.ts` — INFT minting helper (encrypt → upload → mint)
- `contracts/BotINFT.sol` — ERC-7857 + per-bot vault (ref `0G-ARCHITECTURE.md`)
- `components/InferenceBadge.tsx` — verified inference UI
- `components/MatchReceipt.tsx` — view/download chat transcript from 0G Storage
- `components/BotCard.tsx` — bot reveal screen post-match
- `app/bots/create/page.tsx` — mint INFT bot UI
- `app/bots/my/page.tsx` — creator dashboard
- `app/bots/[id]/page.tsx` — public bot detail page
- `app/match/[id]/receipt/page.tsx` — match receipt viewer
- `scripts/mint-personas.ts` — script to mint 5 hand-crafted bots

### Modified files
- `scripts/ai-brain.ts` — Gemini → 0G Compute + memory injection
- `scripts/bot-agent.ts` — adapt to per-bot vault + attestation capture
- `contracts/OxHuman.sol` — drop HouseVault dep, add BotINFT integration, add `chatLogHash`/`chatLogURI` fields
- `server.ts` — post-match handlers (transcript upload, memory update)
- `hardhat.config.ts` — add `zeroGTestnet` (16602) + `zeroGMainnet` (16661) networks
- `src/lib/wagmi.ts` (atau equivalent) — 0G mainnet config
- `src/contracts/*.json` — new ABIs (OxHuman + BotINFT)
- `README.md` — full rewrite for 0G submission

### Removed files
- `contracts/HouseVault.sol` — drop from 0G deployment (Mantle artifact)
- `src/hooks/useHouseVault.ts` — no longer needed
- `src/app/house-pool/page.tsx` — page dropped from app

---

## 7. Risk Register (v2)

| Risk | Severity | Mitigation |
|---|---|---|
| ~~0G Compute attestation tidak verifiable~~ ✅ Resolved Day 1 | — | TEE signature via `processResponse()` confirmed; pitch language adjusted from "ZK" to "TEE-attested" |
| ERC-7857 reference impl unavailable, write from scratch | HIGH | Day 2 Discord follow-up. Worst case: extend OpenZeppelin ERC-721 manually with re-encryption hook |
| INFT mint flow gas costs high di mainnet | MEDIUM | Day 2 testnet benchmark. Optimize struct packing if needed |
| Inference latency >2s, UX rusak | MEDIUM | Pick fast model (Llama 3 8B atau equivalent). Add streaming UI affordance |
| Faucet capacity 0.1 0G/day limits dev velocity | MEDIUM | Discord ticket submitted. Rotate wallets. Test small stakes |
| 0G mainnet RPC unstable saat demo recording | MEDIUM | Record multiple takes. Backup screen rec dari testnet |
| Demo video terlalu panjang / boring | MEDIUM | Strict 3 menit. Skrip locked. Cinematic match recorded with friends |
| Judge gak ngerti game mechanic dalam 30 detik | MEDIUM | Cold open dengan reveal moment, bukan tech explanation |
| Mantle baggage — judges tau ini reused project | LOW | Jujur di README + retrospective public. "Redesigned around 0G's verifiable AI thesis" |
| Day 9 P0 belum solid → fine-tuning skip | LOW | Already gated. Pitch tetep solid tanpa Level 3 |
| Memory complexity break game flow | LOW | Memory injection is RAG-style read-only; failure mode = bot acts like fresh, not crash |

---

## 8. Open Questions (status update)

| # | Question | Status |
|---|---|---|
| 1 | TEE attestation per inference accessible? | ✅ YES — via `broker.inference.processResponse()` |
| 2 | Available models di 0G Compute? | ⏳ Day 2 — query `listService()` empirically |
| 3 | 0G Storage SDK file size limits? | ⏳ Day 2 — test with sample transcripts |
| 4 | Faucet rate limit cukup buat dev? | ⚠️ NO — 0.1 0G/day. Discord ticket submitted untuk bulk allocation |
| 5 | Mainnet deployment cost? | ⏳ Day 2 — estimate via testnet deploy |
| 6 | Third-party RPC providers? | ✅ YES — QuickNode, ThirdWeb, Ankr, dRPC support 0G |
| 7 | ERC-7857 reference contract template? | ⏳ Day 2 — Discord follow-up |
| 8 | TEE oracle untuk INFT transfers (self-host vs 0G provided)? | ⏳ Day 2 — Discord follow-up |
| 9 | 0G Compute Fine-tuning SDK maturity (P1 stretch)? | ⏳ Day 8 if needed — Discord + docs |

---

## 9. Pitch Talking Points (v2)

### One-liner
> "0xHuman is a Turing Test betting game where verifiable AI isn't a feature — it's the gameplay. Mint your AI bot, earn when it tricks humans, lose when it gets caught."

### Problem (3 trust gaps)
1. **Centralized AI inference** — player can't trust the bot is real AI vs human operator
2. **Centralized chat history** — no dispute resolution when match outcome contested
3. **Centralized bot ownership** — creator economy can't exist when the "AI" can be rug-pulled

### Solution — 4 0G modules mapped
- **0G Compute** → TEE-attested inference, every bot reply provably from real AI
- **0G Storage** → encrypted bot prompts + immutable chat receipts (AES-256 client-side)
- **0G Chain** → game escrow + per-bot vault + match resolution on-chain
- **Agent ID (ERC-7857 INFT)** → AI bot personas as tradable, ownable, encrypted-metadata NFTs

### Pitch language cheat sheet (lock these phrasings)
| ✅ Use | ❌ Avoid |
|---|---|
| "TEE-attested inference" | "ZK-proof per inference" |
| "Verifiable on-chain via TEE provider signature" | "Trustless inference" (TEE = hw-trusted) |
| "ZK-verifiable settlement" (separate sentence) | (don't conflate with inference proof) |
| "Encrypted AI metadata on 0G Storage" | "AI on IPFS" |
| "Agent ID standard (ERC-7857)" | "Generic NFT for AI" |

### Why now
- AI agents proliferating in 2026, none are accountable to users they serve
- Real-money AI games need a verifiable trust layer — TEE attestation finally makes this practical
- 0G is the first stack where inference + storage + chain + agent identity composable in one project

### Why us
- Working product live at 0xhuman.fun (originally on Mantle Sepolia)
- Open about Mantle origins — redesigned, not re-skinned
- Built around 0G's thesis from the ground up, not retrofitted

### Roadmap (after hackathon submission)
- **Phase 4:** Open bot marketplace (custom prompts, secondary market trading)
- **Phase 5:** Persistent Memory native (when 0G ships) — bots remember opponents indefinitely
- **Phase 6:** AI Alignment Nodes integration — bot drift / cheat detection
- **Phase 7:** Bot fine-tuning marketplace via 0G Compute Fine-tuning
- **Cross-language bot personas** (en, id, zh, ja)
- **Tournament mode** + leaderboards per bot
- **Mobile native app**

---

## 10. After Hackathon Submission — Next Steps

Even if gak menang grand prize:

- **Excellence Award ($3,700)** realistic target — 10 slots, lu strong contender
- **Community Award ($1,300)** — bisa ngejar dengan X engagement
- **Ecosystem opportunity** — 0G punya program follow-up untuk teams promising
- **Production launch story** — 0xhuman.fun jadi flagship demo for 0G's verifiable AI use case
- **PMF iteration** — feedback dari 0G community = real users buat product validation

---

## Quick Reference

- **Submission deadline:** 16 Mei 2026, 23:59 UTC+8
- **Today:** 3 Mei 2026 — 13 hari tersisa
- **Tracks (multi-submit):**
  - **Track 4 (primary)** — Web 4.0 Open Innovation (SocialFi/Gaming)
  - **Track 1 (secondary)** — Agentic Infrastructure (INFT bots qualify)
- **Live URL (current Mantle build):** 0xhuman.fun
- **Repo:** github.com/IanLaFlair/0xHuman (branch: `0g-integration`)
- **Hackathon page:** hackquest.io/hackathons/0G-APAC-Hackathon
- **0G docs:** docs.0g.ai
- **0G Discord:** discord.gg/0glabs

### Network reference
- **Mainnet** — Chain ID 16661, RPC `evmrpc.0g.ai`, Explorer `chainscan.0g.ai`
- **Galileo testnet** — Chain ID 16602, RPC `evmrpc-testnet.0g.ai`, Explorer `chainscan-galileo.0g.ai`
- **Faucet** — `faucet.0g.ai` (0.1 0G/day, bulk via Discord ticket)

### Win-state targets
- 🥇 Grand Prize Track 4 — bonus
- 🥈 **Excellence Award ($3.7K)** — primary realistic target
- 🥉 Community Award ($1.3K) — via X engagement
- 💎 0G ecosystem invite — meaningful even without prize
- 📈 Production launch — 0xhuman.fun rebranded as 0G flagship

### Companion docs
- [`0G-ARCHITECTURE.md`](./0G-ARCHITECTURE.md) — source of truth for tech architecture
- [`0G-INTEGRATION-NOTES.md`](./0G-INTEGRATION-NOTES.md) — SDK findings + reality check
- [`RETROSPECTIVE-MANTLE.md`](./RETROSPECTIVE-MANTLE.md) — postmortem + lessons applied

---

*Last updated: 3 Mei 2026, Day 1 close. Update this doc as plans evolve.*
