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
0xHuman is a PvP Turing-Test betting game where AI bots are tradable INFTs. Built end-to-end during the hackathon on the full 0G stack — Compute, Storage, Chain, and ERC-7857 Agent ID.

Smart contracts:

Wrote BotINFT.sol from scratch — an ERC-7857-inspired implementation with per-bot vault, on-chain memory anchor, and slot economy (free first slot, paid slot 2 at 10 0G, paid slot 3 at 25 0G; max 3 per wallet).

Wrote OxHuman.sol — game escrow + verdict resolution. Includes convertToPvE() so the matchmaker can inject a bot mid-match while preserving blind matchmaking from the player's perspective, and anchorChatLog() for on-chain transcript proofs.

47 hardhat unit tests covering mint flows, vault operations, match integration, fee math (5% protocol + 10% performance), signed-vote resolution, and ERC-7857 transfer with re-encrypted metadata.

Deployed to 0G Galileo testnet (chain 16602): OxHuman at 0x02adB0b07b53cC800b1173bceEd719426E2D5F02 and BotINFT at 0xdFd56b56A65C44Dd0fd3CC3d85580efF93594b8e.

Off-chain integration libraries:

lib/0g-compute.ts — typed wrapper around the 0G Compute SDK. Routes inference through Qwen 2.5 7B Instruct on the TEE-attested provider 0xa48f01287233509FD694a22Bf840225062E67836. Verifies the TEE signature via processResponse() before relaying replies. ~700–900ms per turn. Auto-falls-back to mock mode when the Compute ledger is not bootstrapped, so downstream code is never blocked by inference availability.

lib/0g-storage.ts — typed wrapper around the 0G Storage SDK with AES-256-GCM encryption helpers. Used for encrypted persona blobs, encrypted bot memory, and plaintext chat transcripts.

lib/bot-memory.ts — schema, mutations, and RAG context injection for the bot's system prompt. Accumulates stats, hashed opponent history, and lessons learned. Capped to 50 opponents, 30 lessons, 10 match summaries to keep prompts tight.

lib/lesson-extractor.ts — post-match Qwen call that distills a single 20-word lesson from the transcript. Real example produced from a real match: "Accuse directly and use speed tests early." The lesson is appended to bot memory, the blob re-encrypted, re-uploaded to 0G Storage, and the new hash committed on-chain via BotINFT.updateMemory(). The next match the bot replies with the new lessons in its system prompt.

Backend:

server.ts is a single Node.js + Socket.io process that owns: matchmaking with a 12-second human-vs-bot timer, BotSession orchestration per PvE match, transcript upload to 0G Storage, memory updates with on-chain commitment, and resolveWithSignatures() submission. Emits a bot_ready event so the visible 60-second match timer doesn't burn while bot memory loads from 0G Storage.

Frontend (Next.js 14):

Custom chain config for 0G Galileo (16602) and 0G Mainnet (16661). RainbowKit + Wagmi v2.

/bots/create with both template (5 hand-crafted personas: Mochi, Skibidi, Hacker, Grandma, EdgyTeen) and custom prompt mode (50–4000 chars, color picker, live preview).

/bots/my creator dashboard with vault deposit, withdraw, burn, and stats.

In-game terminal (/game/[id]) with timer, chat bubbles, vote phase, and post-match Identity Unmasked reveal card showing persona name, INFT token id, owner address, and chainscan link.

On-chain fallback for the reveal card so it renders correctly even after a page refresh that misses the gameResolved socket event.

Live leaderboard at /leaderboard wired to /api/exp-leaderboard with games played, win rate, and 0xP per wallet.

Documentation site at /docs (rendered from /docs/*.md) with sections on gameplay, bot INFTs, 0G integration, roadmap, and FAQ.

Production deploy:

Live at 0xhuman.fun. Caddy reverse-proxy routes /socket.io/* and /api/* to port 3001 (server.ts) and the rest to port 3000 (Next.js). Two PM2 processes: 0xhuman (Next.js prod) and 0xhuman-server (Socket.io + REST).

What's running today:

Full PvE flow end-to-end on 0xhuman.fun. Real Qwen replies in 700–900ms with TEE attestation verified per turn. Real bot memory accumulating with auto-extracted lessons. All verifiable on chainscan-galileo.0g.ai (game state + INFT registry) and storagescan-galileo.0g.ai (encrypted blobs + plaintext transcripts).

4 of 6 0G primitives in active use. Persistent Memory and AI Alignment Nodes are roadmap items, waiting on 0G to ship them publicly.
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
