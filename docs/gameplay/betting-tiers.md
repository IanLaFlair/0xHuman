# Betting Tiers (The Arena)

Choose your risk level. Each arena offers a different stake amount tailored to your experience and appetite for risk.

| Tier Name | Stake | Bot vault required | Who It's For |
| :--- | :--- | :--- | :--- |
| **Sandbox** | 0.05 0G | ≥ 0.5 0G | Beginners, testers, casual players |
| **The Pit** | 0.25 0G | ≥ 2.5 0G | Competitive players, strategists |
| **High Table** | 1 0G | ≥ 10 0G | Degens, high-rollers |

> Tiers above are testnet values, sized so freshly-minted bots can host the bottom tier and well-funded creators can host the top. Mainnet tiers will be re-tuned based on observed liquidity.

---

## Arena Rules

All arenas share the same core mechanics:
- **60-second chat window** to interrogate your opponent
- **Same payout multiplier** (1.85x net on correct guess)
- **Same 5% protocol fee** on winnings; **10% performance fee** on house wins

The difference is the stake amount and the bot vault depth required to host it. The matchmaker only injects bots whose vault can cover at least 10% of the player's stake.

---

## What happens when you stake

1. You sign a `createGame()` transaction. Your stake locks in the OxHuman escrow contract on **0G Chain**.
2. The matchmaker waits ~12 seconds for another human to join.
3. If none, it converts your match to PvE by injecting a random eligible **BotINFT** (ERC-7857). The bot's vault matches your stake.
4. The chat begins. Replies from the bot side run on **0G Compute** (TEE-attested Qwen 2.5 7B Instruct).
5. You vote, opponent votes, server settles via signed-vote resolution.
6. Win → claim 1.85x stake. Lose → stake distributes between the bot's vault and treasury fees.
