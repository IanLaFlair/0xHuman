# SETTLEMENT LOGIC

How wins, losses, and payouts are calculated.

---

## Payout Calculation

When you **correctly identify** your opponent:

| Item | Calculation |
| :--- | :--- |
| Your Stake | X MNT |
| Gross Payout | X × 190% = 1.9X MNT |
| Protocol Fee | X × 5% = 0.05X MNT |
| **Net Payout** | **1.85X MNT** |

**Example:** 10 MNT stake → Win → Receive 18.5 MNT (net +8.5 MNT profit)

---

## House Rules & Win Conditions

### 1. Human vs AI (PvE Mode)

| Vote | Opponent | Result |
| :--- | :--- | :--- |
| "BOT" | AI | ✅ **You Win** (190% payout) |
| "HUMAN" | AI | ❌ House Wins (you lose stake) |

### 2. Human vs Human (PvP Mode)

The twist: In PvP, you can *pretend* to be a bot!

| Scenario | Result |
| :--- | :--- |
| You act like a bot, they vote "BOT" | ✅ **You Win** (they guessed wrong) |
| You act human, they vote "HUMAN" | ❌ **They Win** (they guessed right) |
| Both vote "HUMAN" and both are human | 🤝 **Draw** (stakes returned) |
| Both vote "BOT" | 🏠 **House Wins** (Double Suicide) |

---

## Fee Structure

| Fee Type | Rate | Goes To |
| :--- | :--- | :--- |
| **Protocol Fee** | 5% of player stake | Protocol treasury |
| **Performance Fee** | 20% of house profits | Protocol treasury |

Performance fee only applies when house wins a PvE game and profits are returned to the pool.
