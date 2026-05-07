# 0xHuman — HackQuest Submission Form Cheatsheet

Field-by-field copy-paste content for the 0G APAC Hackathon submission on hackquest.io. Plain text — paste into HackQuest's WYSIWYG editor without any markdown syntax. Apply heading / bold / list formatting via the editor toolbar after pasting if you want emphasis.

---

## Project Name

```
0xHuman
```

---

## Project Intro (≤200 chars)

Pick one. Recommended is **A**.

### A — Player POV (189 chars) — recommended

```
Stake 0G, chat 60s with a stranger, vote: human or AI? Right wins 1.85x. Bots are tradable INFTs (ERC-7857) with TEE-attested replies on 0G Compute and encrypted prompts on 0G Storage.
```

### B — Tech-first (187 chars)

```
PvP Turing-Test betting game where AI bots are tradable INFTs (ERC-7857). Stake 0G, chat 60s, vote human or bot. TEE-attested replies via 0G Compute, encrypted prompts on 0G Storage.
```

### C — Creator-economy angle (187 chars)

```
PvP Turing Test betting on 0G. AI bots are tradable INFTs — owners earn when humans lose to them. TEE-attested replies, encrypted prompts, on-chain memory. Verifiable AI as gameplay.
```

---

## Tech Tags (8 of 8 max)

Click these presets:

- Next
- React
- Node
- Solidity
- Ethers
- Web3

Click "Add New" for these two custom tags:

- 0G
- AI

Reasoning: 0G is the platform tag judges actively filter by; AI is the broader category that maps to Track 1 (Agentic Infrastructure) and the hackathon's overall thesis.

---

## Description (long form)

Paste the block below into the Description editor. Then optionally select section titles ending with a colon (e.g. "How a match plays:") and apply Heading 2 via the toolbar. No markdown — just plain text.

```
0xHuman is a PvP Turing-Test betting game where AI bots are tradable INFTs. Built end-to-end on the 0G stack: Compute, Storage, Chain, and ERC-7857 Agent ID.

How a match plays:

Stake 0G into escrow.

Chat 60 seconds with a stranger in a blind room. Player never knows whether the opponent is human or AI at sign time.

Vote: human or bot. Right answer pays 1.85x. Wrong answer loses the stake.

Reveal post-match: if it was an AI, a card shows the persona name, INFT token id, and the owner who earned from the win.

Learn: the bot extracts a lesson from the transcript and gets smarter for the next match.

The twist: in PvP mode, humans are encouraged to mimic AI. Fool another human into voting BOT on you and you steal their stake.

The 3 trust gaps that justify needing 0G:

Is the AI real? Without 0G, the server could just be a human pretending to be the bot. With 0G, every reply has a TEE attestation from 0G Compute that anyone can verify on-chain.

What was actually said? Without 0G, server-controlled chat history can be edited or hidden. With 0G, every transcript is pinned to 0G Storage and the hash is anchored on-chain via OxHuman.anchorChatLog().

Who owns the AI? Without 0G, the operator owns the model and there is no real creator economy. With 0G, every bot persona is an ERC-7857 INFT with encrypted metadata, owned by the creator who minted it.

Without verifiable AI infrastructure, the entire Turing-Test betting market collapses. 0G is what makes it economically rational.

The bot economy:

Every AI bot is an ERC-7857 INFT (Agent ID) on 0G Chain. Free first slot, paid slot 2 (10 0G), paid slot 3 (25 0G). Max 3 bots per wallet. Each bot has its own vault that matches player stakes 1:1. When humans lose to your bot, the vault grows. When they beat it, the vault shrinks. Break-even win rate is 51.5%.

The bot's persona prompt is encrypted with AES-256-GCM and uploaded to 0G Storage. Only the owner holds the key. Anyone can verify by downloading the blob from storagescan-galileo.0g.ai — without the key, it is hex garbage.

Memory and learning:

After every match, Qwen reads the transcript and extracts ONE lesson about the player's tactics. The lesson is appended to the bot's memory blob, encrypted, re-uploaded to 0G Storage, and the new hash is committed on-chain via BotINFT.updateMemory(). The next match, the bot's system prompt includes the accumulated lessons.

A real lesson auto-extracted from a real match: "Accuse directly and use speed tests early."

After 30 matches, the bot has a real playbook of opponent tactics. Replies adapt accordingly.

Tech stack:

Smart contracts in Solidity 0.8.24 — OxHuman (game escrow + verdict resolution) and BotINFT (ERC-7857 + per-bot vault + memory anchor). 47 hardhat unit tests passing.

AI inference on 0G Compute provider running Qwen 2.5 7B Instruct in TEE. ~700-900ms per turn, attestation verified per call.

Storage uses AES-256-GCM client-side encryption for personas and memory; plaintext JSON for chat transcripts (auditable). All uploaded via the official 0G Storage SDK.

Frontend in Next.js 14 with RainbowKit, Wagmi v2, and Socket.io client.

Backend is a single Node.js + Socket.io process orchestrating matchmaking, bot session, and post-match handlers.

Live on 0G Galileo testnet:

Live demo at 0xhuman.fun. OxHuman contract at 0x02adB0b07b53cC800b1173bceEd719426E2D5F02. BotINFT contract at 0xdFd56b56A65C44Dd0fd3CC3d85580efF93594b8e. 4 of 6 0G primitives in active use. Persistent Memory and Alignment Nodes are roadmap items, waiting on 0G to ship them.
```

---

## Progress During Hackathon

```
We had previously submitted an earlier version of 0xHuman to the Mantle hackathon. It lost. We came back honest about what didn't work and rebuilt the entire architecture around 0G's verifiable-AI thesis.

The Mantle build is preserved at git tag legacy-mantle-v1. The current main branch is a different project.

Architecture redesign:

Dropped HouseVault entirely. The Mantle build had a global LP pool that backed all PvE matches — anonymous, single-operator, untrustable. Replaced with per-bot vaults: each INFT has its own bankroll, its owner has skin in the game.

Replaced Gemini with 0G Compute (Qwen 2.5 7B Instruct, TEE-attested). Centralized inference becomes verifiable.

Added INFT bot ownership via ERC-7857 with encrypted metadata on 0G Storage.

Smart contracts:

Wrote BotINFT.sol from scratch — ERC-7857-inspired with per-bot vault, memory anchor, slot economy.

Refactored OxHuman.sol to drop HouseVault dependency, integrate BotINFT, and add convertToPvE() for blind matchmaking and anchorChatLog() for transcript proofs.

47 unit tests covering mint flows, vault operations, match integration, fee math, signature resolution, and ERC-7857 transfer with re-encrypted metadata.

Off-chain integration:

Wrote lib/0g-compute.ts wrapper with TEE attestation verification and auto-fallback to mock mode when the Compute ledger is not bootstrapped.

Wrote lib/0g-storage.ts wrapper with AES-256-GCM encryption helpers.

Wrote lib/bot-memory.ts with schema, mutations, and RAG context injection for the bot's system prompt.

Wrote lib/lesson-extractor.ts — post-match Qwen call that distills a single lesson from the transcript and appends it to the bot's memory.

Backend rewrite:

Replaced the separate bot-agent.ts Mantle process with a single 0G-aware server.ts that owns matchmaking, bot orchestration via BotSession, transcript upload to 0G Storage, memory updates with on-chain commitment, and resolution via signed votes.

Frontend:

Switched all chains from Mantle to 0G Galileo (chain 16602) and 0G Mainnet (chain 16661).

Built /bots/create with template and custom prompt mode (5 hand-crafted personas plus user-authored personas).

Built /bots/my creator dashboard.

Built post-match Identity Unmasked reveal card with persona name, INFT token id, owner address, and chainscan link.

Added on-chain fallback so the reveal card renders even if the page is refreshed and the gameResolved socket event was missed.

Replaced the static "Coming Soon" leaderboard with live data from /api/exp-leaderboard.

Production deploy:

Deployed contracts to Galileo testnet. Updated VPS at 0xhuman.fun: pulled main, rebuilt, added 0xhuman-server PM2 process for Socket.io and REST. Cleaned legacy Mantle-era leaderboard data while preserving the deployer wallet for demo continuity.

Documentation:

Rewrote README around the 0G architecture. Wrote docs/hackathon/0G-ARCHITECTURE.md (full tech spec), RETROSPECTIVE-MANTLE.md (honest postmortem), and PITCH-DECK.md (12-slide content draft). Rewrote /docs/* for the new architecture (gameplay, bot INFTs, 0G integration).

What is running today:

Full match flow live on 0xhuman.fun. Real Qwen replies in 700-900ms with TEE attestation verified per turn. Real bot memory accumulating with auto-extracted lessons. All verifiable on chainscan-galileo.0g.ai and storagescan-galileo.0g.ai.

Honest disclosure:

This project did not start during this hackathon — the concept and Mantle build pre-dated it. What we built during the hackathon period is the 0G integration layer: smart contracts, library wrappers, INFT economy, encrypted persona storage, memory and lesson extraction, frontend rewrite, VPS production deploy, and all documentation. The Mantle pre-history is at git tag legacy-mantle-v1 for full transparency.
```

---

## URLs

| Field | Value |
| --- | --- |
| Live demo | `https://0xhuman.fun` |
| GitHub repo | `https://github.com/IanLaFlair/0xHuman` |
| Demo video | _(insert YouTube/Loom link after recording)_ |
| Docs | `https://0xhuman.fun/docs` |
| X / Twitter post | _(insert your launch tweet link)_ |

---

## Smart Contract Addresses (Galileo testnet, chain 16602)

| Contract | Address |
| --- | --- |
| OxHuman | `0x02adB0b07b53cC800b1173bceEd719426E2D5F02` |
| BotINFT (ERC-7857) | `0xdFd56b56A65C44Dd0fd3CC3d85580efF93594b8e` |
| 0G Compute provider (Qwen 2.5 7B) | `0xa48f01287233509FD694a22Bf840225062E67836` |

Explorer base URL: `https://chainscan-galileo.0g.ai`

---

## Tracks

- ✅ Track 4 — Web 4.0 Open Innovation (SocialFi/Gaming) — primary
- ✅ Track 1 — Agentic Infrastructure — secondary

---

## Hashtags / handles for the X submission post

```
#0GHackathon #BuildOn0G @0G_labs @0g_CN @0g_Eco @HackQuest_
```

---

## Suggested X post drafts

Pick one. Attach a screen-recorded demo video clip (≤2:20 to fit X) or a screenshot of the Identity Unmasked reveal card.

### Launch hook (272 chars)

```
introducing 0xhuman 🤺

stake. chat 60s. vote: human or bot?
wrong → lose. right → 1.85x.

bots are INFTs on @0G_labs.
TEE-attested replies. encrypted prompts. verdict on-chain.

mint a bot, deploy it, earn while u sleep.

0xhuman.fun

#BuildOn0G #0GHackathon
```

### Provocation (267 chars)

```
what if every AI reply had a cryptographic proof it wasn't a human pretending?

we built that. then wrapped it in a turing-test betting game where u stake on human-or-bot.

bots are INFTs. owners earn when u fold.

powered by @0G_labs

0xhuman.fun

#BuildOn0G #0GHackathon
```

### Pure degen short (243 chars)

```
new meta unlocked on @0G_labs 🤺

spot the bot. fake the soul. take the pot.

stake → 60s chat → vote human or bot
wrong eat ur stake
right 1.85x

bots are tradable INFTs. mint one, set the prompt, watch ur bot cook.

0xhuman.fun

#BuildOn0G #0GHackathon
```

### Suggested thread (post these as replies under the main tweet)

Reply 1 (with screenshot of reveal card):

```
the moment you realize the AI just unmasked YOU 💀

(mochi token #1, owned by @creator. real qwen reply via @0G_labs compute, TEE-verified per turn.)
```

Reply 2 (with screenshot of storagescan + decrypt):

```
the bot's persona is encrypted on @0G_labs storage. owner controls the AI's intelligence — not us, not the operator.

download any blob → hex garbage. decrypt with the persona key → that's the actual prompt.
```

Reply 3 (submission compliance):

```
submitted to the @HackQuest_ 0G APAC Hackathon — full repo + demo + contracts at 0xhuman.fun

/cc @0g_CN @0g_Eco
```

---

## Demo video recording — quick path (15 minutes total)

If you don't have a polished demo recorded yet, here's a minimal solo screen-record that satisfies the submission requirement.

### Pre-record checklist

- VPS up: `pm2 ls` shows both `0xhuman` (web) and `0xhuman-server` online.
- Wallet connected with the `0x7200c2e8…7d9b` account that has Mochi #1 minted.
- A clean browser window (close other tabs, hide bookmarks bar).
- Open these tabs in order so you can switch quickly:
  - `https://0xhuman.fun/`
  - `https://0xhuman.fun/bots/my`
  - `https://0xhuman.fun/bots/create`
  - `https://0xhuman.fun/arena`
  - `https://chainscan-galileo.0g.ai/address/0x02adB0b07b53cC800b1173bceEd719426E2D5F02`
  - `https://storagescan-galileo.0g.ai/`

### Recording script (~2:00–2:30)

00:00–00:15 — landing page. "0xHuman is a PvP Turing Test betting game on 0G. Verifiable AI is the gameplay, not the gimmick."

00:15–00:30 — `/bots/my` shows Mochi #1. "Every AI bot is an ERC-7857 INFT with its own vault. This is mine."

00:30–00:45 — `/bots/create` template + custom mode. "Anyone can mint a bot — pick a template or write your own prompt. The persona is encrypted before it ever touches storage."

00:45–01:00 — `/arena` → Sandbox 0.05 → Initialize. Show the wallet popup.

01:00–01:45 — game terminal. Bot greets you. Type 2-3 messages. Show the timer running.

01:45–02:00 — vote BOT, resolve, reveal card. "I just won. Mochi was the bot. Token id, owner, chainscan link, all on-chain."

02:00–02:15 — open chainscan address, show the latest tx. Open storagescan, show the latest blob. "Encrypted on storage. Anyone can pull it. Without the persona key it's hex garbage."

02:15–02:30 — outro. "Live at 0xhuman.fun. Repo at github.com/IanLaFlair/0xHuman."

### Tools

- macOS: Cmd+Shift+5 → Record Selection. 1080p. No audio if you're not narrating.
- Upload to YouTube as Unlisted, or to Loom. Paste the link into the HackQuest "Demo video" field and into the README and X post.

---

## Submission day checklist

- [ ] Project Name saved
- [ ] Project Intro saved
- [ ] 8 Tech Tags selected
- [ ] Description saved
- [ ] Progress During Hackathon saved
- [ ] Live demo URL set to https://0xhuman.fun
- [ ] GitHub repo URL set to https://github.com/IanLaFlair/0xHuman
- [ ] Demo video recorded and URL set
- [ ] Smart contract addresses listed (if there's a field)
- [ ] Both tracks selected (Track 4 primary, Track 1 secondary)
- [ ] X post published with handles + hashtags
- [ ] X post URL submitted to HackQuest
- [ ] All "Incomplete Project" warnings cleared
- [ ] Final smoke test on https://0xhuman.fun (one match in incognito)
- [ ] Submit before 16 May 2026, 23:59 UTC+8

---

*Last updated: 4 May 2026.*
