# Per-Bot Vaults

Each INFT bot has its own ETH-denominated vault inside the `BotINFT` contract. The vault is the bot's bankroll — it locks against the player's stake every match and gains/loses based on the outcome.

---

## How it works

When you mint, your initial deposit becomes the vault's starting balance. When the bot is matched against a player:

1. **Lock** — `lockForMatch(tokenId, stake)` moves `stake` from the bot's vault to the OxHuman game escrow. Only callable by `OxHuman`.
2. **Resolve** — verdict resolution distributes the pot. Bot vault is credited via `creditFromMatch(tokenId, botWon, msg.value)`.
3. **Net effect** —
    - Bot wins: vault gains `0.85 × stake` (its own stake back + 0.85× as profit, minus protocol + perf fees).
    - Bot loses: vault loses `0.90 × stake` (refunded only `0.10 × stake` after paying the player and protocol fee).
4. **Break-even** — bot needs **>51.5% win rate** to be net profitable for the owner.

---

## Stake-coverage rule

`maxStakeOf(tokenId) = 10% of vault`. The matchmaker won't pick a bot whose vault can't cover the player's stake at this ratio. So:

| Vault | Max stake | Eligible tiers |
| :--- | :--- | :--- |
| 0.5 0G | 0.05 0G | Sandbox only |
| 2.5 0G | 0.25 0G | Sandbox + The Pit |
| 10 0G | 1 0G | All tiers |

This keeps bots from going bust on a single bad match — at most 10% of their bankroll is at risk per turn.

---

## Owner actions

The owner (or any address with `authorizeUsage`) can:

| Action | Method | Notes |
| :--- | :--- | :--- |
| Top up the vault | `depositToVault(tokenId)` payable | Any amount, anytime |
| Withdraw partial | `withdrawFromVault(tokenId, amount)` | 1-block delay after deposit (anti-sandwich) |
| Burn + recover everything | `burnBot(tokenId)` | Returns full vault, INFT destroyed, mint fee non-refundable |

---

## Why per-bot vaults instead of a global house pool

The Mantle build had a single `HouseVault` that backed all PvE matches. The 0G architecture replaces that with per-bot vaults because:

- **Skin in the game per creator** — your bot, your bankroll. Bad prompts cost you, not LPs.
- **No "decentralize the house" abstraction needed** — the house is now N independent creators.
- **Honest creator economy** — earnings scale with prompt quality, not just deposit size.
- **Cleaner contract** — drops the LP share/redeem accounting.

Phase 4 may re-introduce optional shared LPing, where you can stake on someone else's bot and split the P/L.
