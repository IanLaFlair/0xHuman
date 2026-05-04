# 0xHuman — 0G APAC Hackathon Pitch Deck

**Format:** 12 slides, ~3-minute pitch.
**How to use:** each `## Slide N` block is one slide. Copy the title to slide title, the body to slide content. "Visual:" is a guide for what to put on screen. "Talk:" is what to actually say if you're presenting.

---

## Slide 1 — Cover

**Title:** 0xHuman

**Subtitle:** Spot the Bot. Fake the Soul. Take the Pot.

**Body (small text, bottom):**
- A PvP Turing-Test betting game where verifiable AI is the gameplay, not the gimmick.
- 0G APAC Hackathon submission · Track 4 (Web 4.0 SocialFi/Gaming) + Track 1 (Agentic Infra)
- 0xhuman.fun · github.com/IanLaFlair/0xHuman

**Visual:** Logo + a single screenshot of the terminal landing page with the tagline, faded behind.

**Talk:** Two-line opener. "0xHuman lets you bet on whether you're talking to a human or an AI. Built on 0G because without verifiable AI, the entire game collapses."

---

## Slide 2 — The 60-Second Game

**Title:** How a match plays

**Body:**
1. **Stake** 0G into escrow.
2. **Chat 60 seconds** with a stranger in a blind room.
3. **Vote**: human or bot?
4. **Resolve on-chain**: correct → 1.85x payout. Wrong → lose stake.

**The Twist:** in PvP, humans are *encouraged* to mimic AI. If you fool another human into voting "BOT" on you, you steal their stake.

**Visual:** Three-pane mockup — (1) stake screen, (2) chat terminal with timer, (3) reveal card showing "Defeated by Mochi (token #1)".

**Talk:** "It's the Turing Test, but money on the line. And the meta is bidirectional — humans pretend to be bots to win, bots learn to fake being human better."

---

## Slide 3 — The 3 Trust Gaps

**Title:** Why this needs 0G

**Body (3-column table or 3 stacked rows):**

| Gap | Without 0G | With 0G |
| --- | --- | --- |
| **Is the AI real?** | Server could be a human pretending to be the bot | TEE-attested inference on **0G Compute** |
| **What was actually said?** | Server-controlled chat history can be edited or hidden | Transcript pinned to **0G Storage**, hash anchored on-chain |
| **Who owns the AI?** | Operator owns the model | Bot persona is an **ERC-7857 INFT** (Agent ID), encrypted metadata, owned by the creator |

**Visual:** 3 columns of icons (lock / receipt / NFT) with the gap and the 0G module that solves it.

**Talk:** "Every betting game on AI fails the same way: you can't trust the AI is real, the chat is real, or that anyone owns the bot. We use four 0G primitives to close all three gaps."

---

## Slide 4 — The Bot Economy

**Title:** AI bots are INFTs you mint

**Body:**
- Mint a bot persona (template or custom prompt) — first slot is **free**, slot 2 is **10 0G**, slot 3 is **25 0G**. Max 3 per wallet.
- Each bot has its own **vault** that matches player stakes.
- When humans **lose** to your bot → vault grows.
- When humans **beat** it → vault shrinks.
- Break-even win rate: **51.5%**.
- Bot's persona prompt is **encrypted on 0G Storage** — only you (the owner) hold the key.
- Bot's **memory** evolves per match (lessons extracted by Qwen post-game).

**Visual:** Screenshot of `/bots/create` with the 5 persona cards + slot picker, plus the post-match reveal card showing "Mochi · Token #1".

**Talk:** "This is where it gets interesting. The bot is yours. Its prompt is encrypted on-chain. It accumulates memory of every match. Other people fight it, you earn passive income."

---

## Slide 5 — How a Bot Gets Smarter

**Title:** Memory & Learning

**Body:**
- After every match, Qwen reads the chat transcript and extracts ONE lesson about the player's tactics.
- Lesson appended to the bot's memory blob.
- Memory blob re-encrypted, uploaded to 0G Storage, hash committed on-chain.
- Next match, the bot's system prompt includes the accumulated lessons.

**Example lesson auto-extracted from a real match:**
> "Accuse directly and use speed tests early."

**Effect after 30 matches:** the bot has 30 distinct tactical patterns it has seen and counters.

**Visual:** A side-by-side: (left) raw chat transcript JSON, (right) extracted lesson + memory delta.

**Talk:** "Every match teaches the bot something. We don't fine-tune weights — we extract lessons via Qwen and inject them as RAG context. After a few weeks of play, your bot is a specialist against the players it keeps facing."

---

## Slide 6 — Tech Architecture

**Title:** Built on the 0G stack

**Body:** (architecture diagram below)

```
USER (Browser)
   ↓ wallet + websocket
BACKEND (Node + Socket.io on VPS)
   ├─→ 0G Compute (Qwen 2.5 7B, TEE-attested per turn)
   ├─→ 0G Storage (encrypted persona, encrypted memory, plain transcripts)
   └─→ 0G Chain
        ├─ OxHuman.sol     (game escrow + verdict resolution)
        └─ BotINFT.sol     (ERC-7857 + per-bot vault + memory anchors)
```

**4 of 6 0G primitives in use:**
- 0G Compute — TEE-attested AI inference
- 0G Storage — encrypted blobs + public transcripts
- 0G Chain — game escrow + INFT registry
- ERC-7857 / Agent ID — tradable bot ownership

**Roadmap:** 0G Persistent Memory + AI Alignment Nodes (when 0G ships them).

**Visual:** The ASCII diagram, OR redraw it cleanly in Excalidraw with the 4 module icons.

---

## Slide 7 — Live Demo Snapshot

**Title:** Live on 0G Galileo testnet

**Body:**
- **Contracts (verified on chainscan-galileo.0g.ai):**
  - OxHuman: `0x02adB0b07b53cC800b1173bceEd719426E2D5F02`
  - BotINFT: `0xdFd56b56A65C44Dd0fd3CC3d85580efF93594b8e`
- **Bot persona:** Mochi (Token #1), 5 hand-crafted templates available, custom prompts also supported.
- **Inference:** Qwen 2.5 7B Instruct via 0G Compute provider `0xa48f01287233509FD694a22Bf840225062E67836`. ~700-900ms per turn, TEE attestation verified per call.
- **Storage:** every match transcript and bot memory upload visible on `storagescan-galileo.0g.ai`.
- **Live URL:** [0xhuman.fun](https://0xhuman.fun)
- **Demo video:** *(insert link to your recorded demo)*

**Visual:** Three screenshots side-by-side: chat terminal mid-match, Identity Unmasked card, decrypted memory JSON.

---

## Slide 8 — Verifiable, End-to-End

**Title:** What you can verify yourself

**Body:**
- **Inference**: every bot reply has a `chatID` returned by the TEE provider. Anyone can call `processResponse(provider, chatID)` and get a boolean back. Reply was real or it wasn't.
- **Persona**: bot's system prompt lives encrypted on 0G Storage. Open `storagescan-galileo.0g.ai`, download the blob — it's hex garbage. Run our decrypt utility with the persona key — it's the actual prompt.
- **Memory**: every memory update commits a new `memoryHash` on-chain via `BotINFT.updateMemory()`. The encrypted blob can't be retroactively edited without changing the hash.
- **Match outcome**: stake escrow + verdict resolution + payout — all on-chain, verifiable in `OxHuman.games(id)`.
- **Chat transcript**: post-match upload to 0G Storage as plaintext JSON. `OxHuman.anchorChatLog(id, hash, uri)` commits the hash on-chain. Disputes can verify the transcript matches.

**Visual:** A "verify panel" mockup showing 4 green checkmarks: TEE signature ✓, persona hash ✓, memory hash ✓, transcript hash ✓.

**Talk:** "Every claim we make on this stack is provable. That's what makes a real-money AI game possible."

---

## Slide 9 — Why this isn't a re-skin

**Title:** Mantle → 0G isn't a port. It's a redesign.

**Body:**
- We previously ran 0xHuman on Mantle. The concept worked. The submission lost.
- The Mantle build had a **HouseVault** (a global LP pool that backed all PvE matches) — one operator, anonymous bots, no verifiability.
- For 0G, we **dropped HouseVault entirely**. Bots are now per-token vaults. Each bot has an owner who put real 0G into its bankroll.
- We replaced Gemini (centralized inference) with **0G Compute** (TEE-attested).
- We added **encrypted personas** + **on-chain memory commitments** + **lesson extraction**.
- Result: every trust gap that made Mantle's version a "fun toy" is closed on 0G.

**Visual:** Two-column "Before / After" comparing Mantle's HouseVault + Gemini + plain bots vs 0G's per-bot vaults + Compute + INFT + memory.

**Talk:** "We're not pretending Mantle didn't happen. We're showing that the 0G stack is what made the concept actually serious."

---

## Slide 10 — Roadmap

**Title:** Where 0xHuman goes from here

**Body:**
- **Phase 1 (live now):** 0G Galileo testnet, full PvE + PvP, INFT + memory + lessons.
- **Phase 2 — Mainnet + Memory:** 0G mainnet deploy, native Persistent Memory when 0G ships, owner-side lesson curation.
- **Phase 3 — Bot Marketplace:** ERC-7857 secondary market, rentals via `authorizeUsage`, "bot LPing" (stake on someone else's bot).
- **Phase 4 — Fine-Tuning + Alignment:** 0G Compute Fine-Tuning per bot, AI Alignment Nodes for drift detection, 0xP airdrop snapshot.

**Visual:** Vertical timeline with 4 milestones. Phase 1 marked LIVE.

---

## Slide 11 — Why us

**Title:** Real product, real users, real on-chain footprint

**Body:**
- **Product is live**: 0xhuman.fun running today on 0G Galileo.
- **Real activity**: matches resolved, bots minted, transcripts anchored, memory blobs evolving. Verifiable on `chainscan-galileo.0g.ai` and `storagescan-galileo.0g.ai`.
- **Honest about origins**: Mantle build documented in repo's `legacy-mantle-v1` tag. We learned what didn't work and used 0G to fix it.
- **Submission-ready**: contracts deployed, demo recorded, repo public, README rewritten for 0G.

**Visual:** A composite — chainscan tx list on the left, storagescan upload list on the right, both showing real activity timestamps.

---

## Slide 12 — Submission

**Title:** Try it / Verify it

**Body:**
- 🌐 **Live app:** [0xhuman.fun](https://0xhuman.fun)
- 📂 **Repo:** [github.com/IanLaFlair/0xHuman](https://github.com/IanLaFlair/0xHuman)
- 🎬 **Demo video:** *(insert YouTube/Loom link)*
- 📜 **Contracts (Galileo testnet):**
  - OxHuman → `0x02adB0b07b53cC800b1173bceEd719426E2D5F02`
  - BotINFT → `0xdFd56b56A65C44Dd0fd3CC3d85580efF93594b8e`
- 🐦 **X post:** *(insert your launch tweet link)*
- 🏆 **Tracks:**
  - Track 4 — Web 4.0 Open Innovation (SocialFi/Gaming) — primary
  - Track 1 — Agentic Infrastructure — secondary
- 🛠️ **Built with:** 0G Chain · 0G Compute · 0G Storage · ERC-7857 · Next.js · Solidity · Qwen 2.5 7B
- 🤝 **Tags:** `#0GHackathon` `#BuildOn0G` `@0G_labs` `@0g_CN` `@0g_Eco` `@HackQuest_`

**Visual:** Big QR code for `0xhuman.fun` on the right, contract addresses + repo link on the left.

**Talk:** "Try it. Verify it. Mint a bot, fight one of ours, decrypt the persona on storagescan if you don't believe us."

---

## Optional appendix slides

If the deck needs to expand for a longer pitch (5+ minutes), consider these add-ons:

### Appendix A — Bot Vault Math

| Action | Effect on bot vault |
| --- | --- |
| Mint (free slot) | + 2 0G initial deposit |
| Match locked | − 1 stake unit |
| Match won | + 1.85 stake unit (covers original stake + 0.85 profit, after 5% protocol + 10% perf fee) |
| Match lost | + 0.10 stake unit (refund of leftover after paying player + protocol fee) |

Bot needs **>51.5% win rate** to be net profitable for the owner.

### Appendix B — How memory turns into adaptation

Before any match, the bot's effective system prompt is:

```
You are Mochi. You're 22, a chill gen-z type, very into cats and lo-fi music...

[YOUR MEMORY]
- You have played 12 matches (66.7% win rate).
- This opponent has played you 3 times before. Last result: win.
- Recent lessons:
  • Players asking weather first are usually human.
  • Direct accusation + speed test combo is most common opener.
  • Math under 5s response signals a bot trying to fake bot.
- Recent matches:
  • Match 12: won (player used emotional)
  • Match 11: lost
```

Qwen sees this every turn. Reply patterns shift accordingly.

### Appendix C — Pricing

**0G Compute (Qwen 2.5 7B Instruct):**
- 0.05 0G / 1M input tokens
- 0.10 0G / 1M output tokens
- Per match: ~1e-4 0G — structurally negligible

**0G Storage:**
- ~0.001 0G per ~500-byte blob (transcript / persona / memory)

**0G Chain (Galileo):**
- Deploy OxHuman: ~0.018 0G
- Deploy BotINFT: ~0.013 0G
- Per match resolve: ~0.005 0G in gas

---

## Production tips for the deck

- **Lead with the demo video link or play it for 30 seconds before reading the deck.** Mantle taught us slides without proof read flat.
- **Slides 3 and 4 are the hooks.** If you only get 2 minutes, those plus slide 12 are enough.
- **Don't read slides 6 and 8 line-by-line.** Let the architecture diagram and the verify-panel speak. Talk over them.
- **Keep slide 9 (Mantle origins).** Honesty about the iteration is a differentiator — every other team's deck pretends their first design was perfect.
- **One screenshot per slide where possible.** Beats walls of text.

---

*Last updated: 4 Mei 2026.*
