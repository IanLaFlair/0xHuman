# Memory & Learning

Every INFT bot accumulates memory across matches. The memory file is stored encrypted on 0G Storage and its hash is anchored on-chain via `BotINFT.updateMemory(tokenId, uri, hash)`. Before the bot replies in a new match, the memory is decrypted and injected into the system prompt as a RAG context block.

---

## What's in memory

```json
{
  "version": "1.0",
  "botId": 1,
  "stats": { "totalMatches": 12, "wins": 8, "losses": 4, "winRate": 0.667 },
  "recentOpponents": {
    "<sha256(address)>": {
      "matchCount": 3,
      "lastResult": "win",
      "lastTactic": "math_questions",
      "ts": 1715000000
    }
  },
  "lessonsLearned": [
    "Players asking about weather first are usually human.",
    "Direct accusation + speed test combo is most common opener.",
    "Math under 5s response signals a bot trying to fake bot."
  ],
  "lastMatchSummaries": [
    "Match 12: won (player used emotional)",
    "Match 11: lost"
  ],
  "updatedAt": 1715000000
}
```

Caps to keep size bounded: 50 recent opponents, 30 lessons, 10 match summaries.

---

## How a lesson is extracted

After every PvE match settles, the server sends the chat transcript to Qwen (via 0G Compute) with a focused system prompt:

> "Output exactly ONE concise lesson (max 20 words) the bot should remember about the player's tactics."

Qwen's response is trimmed, sanity-checked, and appended to `lessonsLearned`. The encrypted memory blob is re-uploaded to 0G Storage; the new hash is committed on-chain.

This runs in the background — failure of the extractor doesn't block resolution; the bot's stats still update without a lesson.

---

## How memory affects gameplay

Before each turn in a match, the bot's effective system prompt looks like:

```
You are Mochi. You're 22, a chill gen-z type, very into cats and lo-fi music...
[base persona body]

[YOUR MEMORY]
- You have played 12 matches (66.7% win rate).
- This opponent has played you 3 times before. Last result: win. Last time they used math_questions.
- Recent lessons:
  • Players asking weather first are usually human.
  • Direct accusation + speed test combo is most common opener.
  • Math under 5s response signals a bot trying to fake bot.
- Recent matches:
  • Match 12: won (player used emotional)
  • Match 11: lost
```

Qwen reads this and adapts. After 30+ matches the bot has a real playbook of opponent tactics, and replies shift accordingly.

---

## Privacy

- Opponent addresses are stored as **sha256 hashes**, not raw addresses, so the memory file doesn't leak whom the bot has played.
- The memory blob is **AES-256-GCM encrypted** with the protocol persona key — only the resolver and authorized clients can decrypt.
- The on-chain `memoryHash` lets anyone prove the encrypted blob hasn't been tampered with retroactively, but doesn't reveal contents.

---

## Future work (post-hackathon)

- **Native Persistent Memory** when 0G ships it — replace the RAG-injected block with a 0G-managed memory store
- **Owner-decryptable view** — give the bot owner a UI to read their bot's memory client-side
- **Lesson voting** — let the owner curate (approve/reject) extracted lessons
- **Cross-bot lessons** — opt-in lesson sharing between bots an owner controls
