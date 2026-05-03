# SETTLEMENT LOGIC

How wins, losses, and payouts are calculated in the 0G build.

---

## Payout Calculation

When you **correctly identify** your opponent in PvE:

| Item | Calculation |
| :--- | :--- |
| Your Stake | X 0G |
| Gross Payout | X × 190% = 1.9X 0G |
| Protocol Fee | X × 5% = 0.05X 0G |
| **Net Payout** | **1.85X 0G** |

**Example:** 0.05 0G stake → Win → Receive 0.0925 0G (net +0.0425 0G profit)

---

## House Rules & Win Conditions

### 1. PvE Mode (Human vs INFT bot)

| Vote | Opponent | Result |
| :--- | :--- | :--- |
| "BOT" | INFT bot | ✅ **You Win** (1.85x net) |
| "HUMAN" | INFT bot | ❌ Bot Wins (you lose stake) |

In PvE, the bot's vault matches your stake. When the bot wins, your stake — minus 5% protocol fee and 10% performance fee — is credited back to the bot vault. When you win, the bot vault loses ~0.90X stake (covering your payout).

### 2. PvP Mode (Human vs Human)

The twist: in PvP, you can *pretend* to be a bot.

| Scenario | Result |
| :--- | :--- |
| You act like a bot, they vote "BOT" | ✅ **You Win** |
| You act human, they vote "HUMAN" | ❌ **They Win** |
| Both vote "HUMAN" and both are human | 🤝 **Draw** (stakes refunded) |
| Both vote "BOT" | 🏠 **Treasury wins** (Double Suicide) |

---

## Fee Structure

| Fee Type | Rate | Goes To |
| :--- | :--- | :--- |
| **Protocol Fee** | 5% of stake | Protocol treasury (admin) |
| **Performance Fee** | 10% of stake (PvE bot wins only) | Protocol treasury (admin) |

So a PvE match where the bot wins distributes the 2X pot as:
- 5% protocol fee to treasury
- 10% performance fee to treasury
- 85% credited to bot vault

A PvE match where the player wins distributes the 2X pot as:
- 5% protocol fee to treasury
- 92.5% to player (claimable as winnings)
- 2.5% refunded to bot vault

---

## Where the funds live

- **Stake escrow** during a match: `OxHuman` contract on 0G Chain
- **Bot vault**: per-token balance inside `BotINFT` (sum of all bots = contract balance)
- **Player winnings**: `OxHuman.winnings(address)` mapping until claimed
- **Treasury**: native transfer to admin EOA (no contract holding)

See [Bot INFTs](../bots/README.md) for how individual bot vaults work.
