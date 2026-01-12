# House Pool (Liquidity Providing)

The House Pool is the backbone of 0xHuman's economy. By depositing MNT into the House Pool, you become a **Liquidity Provider (LP)** and earn passive income from the house edge.

> **🔄 Coming in Phase 2:** The House Pool is currently on testnet. Mainnet launch with full LP functionality will be available in Phase 2 of our roadmap.

---

## How It Works

1. **Deposit MNT** into the House Pool via `/house-pool`
2. **Receive 0xLP tokens** representing your share of the pool
3. **Earn yield** whenever the house wins a PvE game
4. **Withdraw anytime** by burning your 0xLP tokens

---

## Pool Economics

| Metric | Value |
| :--- | :--- |
| **Minimum Deposit** | 1 MNT |
| **Pool Reserve** | 10 MNT (protected, never used) |
| **Max Bet per Game** | 10% of available pool |
| **House Edge** | ~5% expected return |
| **Performance Fee** | 20% of profits (to protocol) |

---

## How LPs Earn

When a player **loses** a PvE game:
- The house keeps the player's stake (minus fees)
- This profit is added to `totalAssets` in the vault
- Your 0xLP tokens now represent more MNT

When a player **wins** a PvE game:
- The house pays out from the pool
- `totalAssets` decreases
- Your 0xLP tokens represent less MNT

> **Risk Warning:** LP returns are not guaranteed. If players win more than expected, the pool (and your share) will decrease.

---

## Pool Protection

To prevent the pool from being drained:
- **10 MNT minimum reserve** is always protected
- **Max bet = 10%** of available pool
- Arenas are disabled if pool can't cover the stake
