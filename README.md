# 0xHuman

> **Spot the Bot. Fake the Soul. Take the Pot.**

The first high-stakes social deduction game on Mantle Network. A gamified Turing Test where you bet on whether your opponent is human or AI.

🌐 **Live Demo:** [0xhuman.fun](https://0xhuman.fun)

---

## What is 0xHuman?

In a world flooded with AI, can you trust who you're talking to? 0xHuman turns the classic Turing Test into a competitive betting arena.

**How it works:**
1. Connect wallet & stake MNT
2. Get matched with an unknown opponent (human or AI)
3. Chat for 60 seconds
4. Vote: `[HUMAN]` or `[BOT]`
5. Guess right → Win 185% | Guess wrong → Lose stake

**The twist:** In PvP mode, humans can pretend to be bots. Fool your opponent and steal their bag.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Wallet | RainbowKit, Wagmi v2 |
| Backend | Node.js, Express, WebSocket (Socket.io) |
| AI | Google Gemini Pro |
| Blockchain | Mantle Network (Sepolia Testnet) |
| Smart Contracts | Solidity, Hardhat |

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Mantle Sepolia testnet MNT ([faucet](https://faucet.sepolia.mantle.xyz))

### Installation

```bash
# Clone the repo
git clone https://github.com/IanLaFlair/0xHuman.git
cd 0xHuman

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
```

### Environment Variables

```env
# Blockchain
NEXT_PUBLIC_CONTRACT_ADDRESS=your_contract_address
NEXT_PUBLIC_CHAIN_ID=5003

# Wallet Connect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# AI (for bot agent)
GEMINI_API_KEY=your_gemini_api_key

# WebSocket Server
NEXT_PUBLIC_WS_URL=http://localhost:3001

# Database (PostgreSQL for EXP system)
DATABASE_URL=postgresql://user:pass@localhost:5432/oxhuman
```

### Running Locally

```bash
# Terminal 1: Start Next.js frontend
npm run dev

# Terminal 2: Start WebSocket server
npx tsx server.ts

# Terminal 3: Start AI bot agent (optional, for PvE testing)
npx tsx scripts/bot-agent.ts
```

Open [http://localhost:3000](http://localhost:3000)

---

## Smart Contracts

Located in `/contracts`:
- `OxHuman.sol` - Main game logic (create, join, resolve games)
- `HouseVault.sol` - House pool for LP deposits (coming soon)

### Deploy Contracts

```bash
# Compile
npx hardhat compile

# Deploy to Mantle Sepolia
npx hardhat run scripts/deploy-v2.cjs --network mantleSepolia
```

---

## Project Structure

```
0xHuman/
├── src/
│   ├── app/           # Next.js pages
│   ├── components/    # React components
│   ├── hooks/         # Custom hooks (useOxHuman, etc)
│   ├── lib/           # Utilities
│   └── contracts/     # ABI files
├── contracts/         # Solidity smart contracts
├── scripts/           # Deployment & utility scripts
├── server.ts          # WebSocket + API server
├── exp-system.ts      # 0xP rewards logic
└── docs/              # Documentation (GitBook format)
```

---

## Game Modes

| Mode | Description |
|------|-------------|
| **PvE** | Human vs AI bot. Correctly identify the bot to win. |
| **PvP** | Human vs Human. You can pretend to be a bot to trick your opponent. |

## Arena Tiers

| Arena | Stake |
|-------|-------|
| Playground | 2 MNT |
| The Pit | 10 MNT |
| High Table | 30 MNT |

---

## Roadmap

- [x] Phase 1: Genesis - MVP on testnet
- [ ] Phase 2: House Pool - LP system, mainnet
- [ ] Phase 3: Airdrop - 0xP snapshot, token distribution
- [ ] Phase 4: Marketplace - Custom AI bots, NFT trading

---

## Contributing

Contributions welcome! Please read the docs and open a PR.

---

## License

MIT

---

## Links

- 🌐 Website: [0xhuman.fun](https://0xhuman.fun)
- 📖 Docs: [0xhuman.fun/docs](https://0xhuman.fun/docs)
- 🐦 Twitter: [@0xHumanGame](https://twitter.com/0xHumanGame)
