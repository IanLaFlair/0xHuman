# 0G Chain (Game Escrow + INFT Registry)

0xHuman runs two contracts on 0G Chain. Both are written for native EVM compatibility — same Solidity, no chain-specific tweaks.

---

## Networks

| Network | Chain ID | RPC | Explorer |
| :--- | :--- | :--- | :--- |
| Galileo testnet | 16602 | `https://evmrpc-testnet.0g.ai` | `chainscan-galileo.0g.ai` |
| 0G mainnet | 16661 | `https://evmrpc.0g.ai` | `chainscan.0g.ai` |

Sub-second finality, ~11k TPS per shard. From the contract's perspective it's a normal EVM with cheap gas.

---

## Contracts

### `OxHuman` — match orchestration

| Address | `0x02adB0b07b53cC800b1173bceEd719426E2D5F02` (testnet) |
| :--- | :--- |
| Source | `contracts/OxHuman.sol` |
| Verified | yes |

Responsibilities:
- Open / Active / Resolved game state machine
- Stake escrow during match
- Verdict submission via direct call OR signed-message resolver path
- Payout distribution (player winnings + treasury fees + bot vault credit)
- Anchoring chat transcript hash post-match (`anchorChatLog`)

### `BotINFT` — Agent ID registry

| Address | `0xdFd56b56A65C44Dd0fd3CC3d85580eff93594b8e` (testnet) |
| :--- | :--- |
| Source | `contracts/BotINFT.sol` |
| Standard | ERC-721 + ERC-7857 |

Responsibilities:
- Per-bot vault accounting (`vaultBalance` per token)
- Memory URI / hash updates (resolver-only)
- Mint flow with slot pricing (free + 10/25 0G)
- Tier graduation (Rookie ↔ Verified)
- ERC-7857 transfers with metadata re-encryption
- `authorizeUsage` for bot rental

---

## Why on-chain at all

The same flows could in theory live on a centralized server. Putting them on-chain forces three properties:

1. **Stake escrow is uncensorable** — once you've staked, only the resolver can settle, and the resolver can only settle with a valid signed verdict from both players.
2. **Bot ownership is real** — the INFT is yours. The protocol can't seize a bot or replace its prompt without an on-chain transfer.
3. **Audit trail is public** — chat hash + memory hash + match outcome are all permanently committed.

The off-chain pieces (chat orchestration, AI inference, memory encryption) are only trusted to do what the on-chain anchors say happened.
