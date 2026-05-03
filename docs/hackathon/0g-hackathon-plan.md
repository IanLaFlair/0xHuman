# 0xHuman × 0G APAC Hackathon — Master Plan

> **Goal:** Submit 0xHuman ke 0G APAC Hackathon dengan integration yang solid, demo crisp, dan story yang nyetel sama thesis 0G (verifiable AI). Deadline: **16 Mei 2026, 23:59 UTC+8**.
>
> **Today:** 3 Mei 2026 → **13 hari tersisa**.

---

## TL;DR

0xHuman = Turing Test betting game di [0xhuman.fun](https://0xhuman.fun). Sebelumnya submit ke Mantle, kalah. Sekarang re-submit ke 0G dengan angle yang **fundamentally lebih kuat**: verifiable AI inference adalah *requirement*, bukan optional. Tanpa 0G, game-nya gak bisa scale ke real money karena trust assumption-nya hancur.

**3 thing yang harus jalan supaya pitch ini menang:**
1. AI inference di-route via **0G Compute** dengan attestation
2. Chat log auto-pinned ke **0G Storage** tiap match
3. `OxHuman.sol` + `HouseVault.sol` deployed ke **0G mainnet**

**Yang di-drop dari scope original:** INFT (ERC-7857) implementation. Move to roadmap, sebut di pitch. Eksekusi dalam 2 minggu = risiko tinggi.

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

## 3. Scope Lock — Apa yang Dikerjakan vs Tidak

### ✅ IN scope (must ship)

| Component | Why |
|---|---|
| **Phase A: Gemini → 0G Compute** | Core thesis. Tanpa ini, gak ada cerita verifiable AI. |
| **Phase B: Chat log → 0G Storage** | Trust Gap #2. Demo-able & strong proof of decentralized data. |
| **Phase C: Deploy ke 0G mainnet** | Mandatory submission requirement. |
| **Frontend: "✓ Verified inference" badge** | UX yang bikin judges *liat* 0G integration di demo, bukan baca README. |
| **Demo video 3 menit polished** | Underrated factor. Banyak project bagus kalah karena demo lemah. |
| **README + architecture diagram** | Judging criterion explicit. |

### ❌ OUT of scope (cut atau move ke roadmap)

| Component | Reason |
|---|---|
| **INFT (ERC-7857) implementation** | High execution risk dalam 2 minggu. Sebut di pitch sebagai "Phase 4 roadmap, design ready." |
| **House Pool LP (Phase 2 Mantle)** | Gak tambah ke 0G story. Distract dari core thesis. |
| **EXP/Leaderboard migrate ke 0G Storage** | Overkill. PostgreSQL aman buat sekarang. |
| **AI bot marketplace** | Phase 4 stuff. Gak ada gunanya half-built. |
| **Multi-chain dual deployment (Mantle + 0G)** | Pilih satu. Untuk hackathon submission, 0G mainnet only. |

### ⚠️ DEPENDS on Day 1 finding

| Component | Decision |
|---|---|
| **`inferenceProof` field di smart contract event** | Ada kalau 0G Compute SDK ekspose attestation yang verifiable. Kalau gak — pitch jadi "logged inference" instead of "verifiable inference." |

---

## 4. 13-Day Execution Plan

### 🔍 Hari 1-2: Foundation + De-risk (3-4 Mei)

**Goal:** Konfirmasi semua asumsi technical sebelum commit ke story.

- [ ] **Test 0G Compute SDK** — coba inference call, cek apakah dapat TEE attestation yang verifiable
  - Kalau ya → pitch "verifiable inference" jalan terus
  - Kalau enggak → pivot pitch ke "logged inference + reproducible verdict"
- [ ] **Deploy `OxHuman.sol` ke 0G testnet** (Galileo) — sanity check EVM compat
- [ ] **Get faucet tokens** untuk 0G testnet & mainnet (cek docs.0g.ai)
- [ ] **Write Mantle retrospective** — list 3 hal yang bikin kalah di Mantle, tulis fix-nya untuk 0G
  - Kemungkinan: demo lemah / pitch generik / contract belum deployed / UX rough
- [ ] **Setup GitHub repo baru** atau branch `0g-integration` di repo existing
- [ ] **First commit** ke repo dengan README skeleton + plan ini

**Output hari 2:**
- File: `RETROSPECTIVE-MANTLE.md`
- File: `0G-INTEGRATION-NOTES.md` (catatan SDK findings)
- Contract deployed ke 0G testnet
- Repo public + first commits

---

### 🛠️ Hari 3-5: Phase A — Gemini → 0G Compute (5-7 Mei)

**Goal:** AI inference fully migrated ke 0G Compute. Core thesis hidup.

- [ ] **Refactor `scripts/ai-brain.ts`:**
  - Replace Gemini API call dengan 0G Compute SDK
  - Pilih model: Llama 3 / DeepSeek / etc (yang availble di 0G providers)
  - Test latency — game butuh response <2 detik buat UX bearable
- [ ] **Update `scripts/bot-agent.ts`:**
  - Adapt response handling
  - Capture inference receipt/proof (kalau available)
- [ ] **Smart contract update (kalau attestation jalan):**
  - Tambah `bytes32 inferenceProof` field ke `Game` struct
  - Tambah `inferenceProof` ke event `VerdictSubmitted`
  - Helper function `verifyInferenceProof()` untuk audit
- [ ] **Frontend: badge "✓ Verified inference"**
  - Component `<InferenceBadge>` di chat bubble
  - Tooltip: "This response came from 0G Compute. Click to verify."
  - Click → modal dengan attestation hash + link ke 0G explorer
- [ ] **Test E2E** — full match dengan AI inference dari 0G Compute

**Output hari 5:**
- AI bot 100% running on 0G Compute
- Frontend nge-show "verified" badge per AI response
- Contract event include inference reference

---

### 💾 Hari 6-7: Phase B — Chat log to 0G Storage (8-9 Mei)

**Goal:** Tiap match transcript persisted ke 0G Storage, hash anchored on-chain.

- [ ] **Backend: post-match handler**
  - Pas match selesai, serialize chat transcript (JSON: timestamps, sender, content)
  - Upload ke 0G Storage via SDK
  - Get storage URI/hash
- [ ] **Smart contract update:**
  - Tambah `bytes32 chatLogHash` + `string chatLogURI` ke Game struct
  - Tambah ke event `MatchSettled`
- [ ] **Frontend: "View match receipt" button**
  - Post-match screen, button buat retrieve transcript dari 0G Storage
  - Show transcript + verify hash matches on-chain commitment
- [ ] **Frontend: "Download chat receipt" button**
  - Export transcript sebagai JSON file dengan signature

**Output hari 7:**
- Setiap match selesai, chat transcript otomatis ke 0G Storage
- Player bisa retrieve & verify transcript-nya sendiri
- On-chain commitment (hash) jadi proof of integrity

---

### 🚀 Hari 8: Phase C — Deploy ke 0G Mainnet (10 Mei)

**Goal:** Production deployment di 0G mainnet. Submission requirement OK.

- [ ] **Pre-deployment checklist:**
  - Smart contracts udah teruji di testnet
  - Gas estimation
  - Constructor params siap
- [ ] **Deploy `OxHuman.sol` ke 0G mainnet**
- [ ] **Deploy `HouseVault.sol` ke 0G mainnet**
- [ ] **Verify contracts on 0G Explorer**
- [ ] **Update frontend config:**
  - RPC URL → 0G mainnet
  - Chain ID
  - Contract addresses
  - Update RainbowKit/Wagmi config
- [ ] **Smoke test mainnet:**
  - Connect wallet
  - Stake → match → vote → settle
  - Confirm chat log uploaded ke Storage
  - Confirm AI inference verified

**Output hari 8:**
- 0xHuman live on 0G mainnet
- Contract addresses + Explorer links saved (untuk submission)
- One successful E2E test on mainnet

---

### ✨ Hari 9-10: Polish + Bug Bash (11-12 Mei)

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

**Goal:** Demo video crisp + semua materi submission ready.

- [ ] **Demo video script (3 menit max):**
  - **0:00-0:20** — Hook. "What if you could bet whether you're chatting with a human or AI?"
  - **0:20-0:50** — Live game flow. Connect wallet, match, chat, vote, win.
  - **0:50-1:30** — 0G integration showcase:
    - Click "Verify inference" — show attestation
    - Click "View match receipt" — show transcript from 0G Storage
    - Show 0G Explorer link with on-chain proof
  - **1:30-2:15** — Why 0G is necessary, not optional. The 3 trust gaps.
  - **2:15-2:45** — Roadmap: INFT bot marketplace.
  - **2:45-3:00** — Outro + CTA + tag handles.
- [ ] **Record demo video** — pakai Loom / OBS, 1080p minimum
- [ ] **Edit + caption** — biar judges yang non-Indonesian paham
- [ ] **Upload ke YouTube/Loom** — public link
- [ ] **README polish:**
  - Hero section dengan demo GIF
  - Quick start (clone, install, run)
  - Architecture diagram (use mermaid atau static image)
  - 0G modules used + how
  - Test account / faucet instructions
  - Contract addresses + Explorer links
- [ ] **Architecture diagram** — sketsa di Excalidraw / Figma:
  - User → Frontend → Backend → 0G Compute / Storage / Chain
  - Trust gaps dipotret jelas
- [ ] **Pitch deck (optional but recommended):**
  - Problem (3 trust gaps)
  - Solution (0G stack mapping)
  - Demo screenshots
  - Roadmap
  - Team
- [ ] **X post draft:**
  ```
  We built 0xHuman: a Turing Test betting game where verifiable AI is
  the gameplay, not the gimmick.

  Powered by @0G_labs Compute (verified inference), Storage (chat receipts),
  and Chain (game logic).

  Spot the bot. Fake the soul. Take the pot.

  [demo screenshot]

  Try it: 0xhuman.fun
  #0GHackathon #BuildOn0G @0g_CN @0g_Eco @HackQuest_
  ```

**Output hari 12:**
- Demo video uploaded
- README final
- Pitch deck (optional)
- X post draft ready

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

## 5. Technical Architecture (Target State)

```
┌─────────────────────────────────────────────────────────┐
│                       USER (Browser)                     │
│  Next.js + RainbowKit + Wagmi + Socket.io client         │
└─────────────────────┬───────────────────────────────────┘
                      │
                      │ WebSocket + RPC
                      ▼
┌─────────────────────────────────────────────────────────┐
│                   BACKEND (Node.js VPS)                  │
│  - Match orchestration (Socket.io)                       │
│  - Inference routing → 0G Compute SDK                    │
│  - Post-match handler → 0G Storage SDK                   │
│  - On-chain settle → ethers.js → 0G Chain                │
└──┬──────────────────┬───────────────────┬───────────────┘
   │                  │                   │
   │                  │                   │
   ▼                  ▼                   ▼
┌──────────┐    ┌────────────┐    ┌──────────────────┐
│   0G     │    │    0G      │    │     0G Chain      │
│ Compute  │    │  Storage   │    │  (EVM mainnet)    │
│          │    │            │    │                   │
│ AI Inf.  │    │ Chat logs  │    │  OxHuman.sol      │
│ + TEE    │    │ +metadata  │    │  HouseVault.sol   │
│ attest.  │    │            │    │  Verdict events   │
└──────────┘    └────────────┘    └──────────────────┘
```

### Data flow per match

```
1. User stakes → OxHuman.sol.startMatch()
2. Match orchestrator pairs user with bot
3. Each chat turn:
   a. User message → bot
   b. Bot inference → 0G Compute (with attestation)
   c. Response → user with "✓ verified" badge
4. Match ends:
   a. Both vote
   b. Backend uploads transcript → 0G Storage → gets URI
   c. Backend submits verdict + chatLogHash + inferenceProofs → contract
   d. Contract settles, payouts execute
5. User can retrieve chat receipt from 0G Storage anytime
```

---

## 6. Files to Create / Modify

### New files
- `RETROSPECTIVE-MANTLE.md` — what failed, what to fix
- `0G-INTEGRATION-NOTES.md` — SDK findings, attestation reality check
- `lib/0g-compute.ts` — 0G Compute SDK wrapper
- `lib/0g-storage.ts` — 0G Storage SDK wrapper
- `lib/0g-chain.ts` — chain config, RPC, addresses
- `components/InferenceBadge.tsx` — verified inference UI
- `components/MatchReceipt.tsx` — view/download chat receipt
- `docs/architecture.md` + diagram
- `docs/0g-modules-used.md` — explicit mapping for judges

### Modified files
- `scripts/ai-brain.ts` — Gemini → 0G Compute
- `scripts/bot-agent.ts` — adapt response handling
- `contracts/OxHuman.sol` — add `chatLogHash`, `chatLogURI`, `inferenceProof` fields & events
- `server.ts` — post-match handler for Storage upload
- `frontend/config/wagmi.ts` — 0G mainnet RPC + chain ID
- `frontend/config/contracts.ts` — new contract addresses
- `README.md` — full rewrite for 0G submission

---

## 7. Risk Register

| Risk | Severity | Mitigation |
|---|---|---|
| 0G Compute attestation tidak verifiable on-chain | HIGH | Day 1 test. Pivot pitch ke "logged inference + reproducible" kalau perlu. |
| Inference latency >5s, UX rusak | MEDIUM | Pakai model yang lebih kecil/cepat di 0G. Add streaming kalau supported. |
| 0G mainnet RPC unstable saat demo recording | MEDIUM | Record multiple takes. Backup screen recording dari testnet. |
| Smart contract gas issues di 0G mainnet | MEDIUM | Test di testnet thoroughly dulu. |
| Demo video terlalu panjang / boring | MEDIUM | Strict 3 menit. Skrip yang tight. Kalau perlu cut roadmap section. |
| Judge gak ngerti game mechanic dalam 30 detik | LOW | Visual cue di video — tagline besar, gameplay obvious. |
| Mantle baggage — judges tau ini reused project | LOW | Jujur di README — "Original concept on Mantle, fully redesigned for 0G's verifiable AI thesis." |

---

## 8. Open Questions (jawab di Day 1-2)

1. **0G Compute SDK availability:** Apakah TEE attestation per inference accessible? Atau cuma response biasa?
2. **Available models di 0G Compute:** Mana yang reasonable untuk chat bot persona? Llama 3 8B? DeepSeek Chat?
3. **0G Storage SDK file size limits:** Cukup buat chat transcript JSON?
4. **0G Chain testnet faucet rate limit:** Cukup buat dev iteration?
5. **0G mainnet deployment cost:** Estimasi gas untuk deploy 2 contracts?
6. **Alchemy/RPC providers:** Available untuk 0G atau harus self-host node?

---

## 9. Pitch Talking Points (untuk demo video & X post)

### One-liner
> "0xHuman is a Turing Test betting game where verifiable AI isn't a feature — it's the gameplay."

### Problem (3 trust gaps)
1. Centralized AI inference = player can't trust the bot is real AI
2. Centralized chat history = no dispute resolution
3. Centralized bot ownership = marketplace is rug-pullable

### Solution (0G mapping)
- **0G Compute** → verifiable inference, every bot reply attested
- **0G Storage** → immutable chat receipts, dispute-ready
- **0G Chain** → on-chain stakes, payouts, audit trail
- **(Future) INFT** → ownable, tradable AI bots

### Why now
- AI agents proliferating, none are accountable
- Real-money AI games need verifiable trust layer
- 0G stack is the first that makes this composable

### Why us
- Already have working product (0xhuman.fun)
- Already battle-tested on Mantle Sepolia
- Now redesigning around 0G's thesis from the ground up

### Roadmap (after hackathon)
- INFT bot marketplace (Phase 4)
- Cross-language bot personas (en, id, zh, ja)
- Tournament mode
- Mobile native app

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
- **Track:** 4 — Web 4.0 Open Innovation (SocialFi/Gaming) — primary
- **Track:** 1 — Agentic Infrastructure — secondary (kalau OpenClaw integration kelas)
- **Live URL:** [0xhuman.fun](https://0xhuman.fun)
- **Repo:** github.com/IanLaFlair/0xHuman
- **Hackathon page:** [0G APAC Hackathon](https://www.hackquest.io/hackathons/0G-APAC-Hackathon)
- **0G docs:** [docs.0g.ai](https://docs.0g.ai/)

---

*Last updated: 3 Mei 2026. Update this doc as plans evolve.*
