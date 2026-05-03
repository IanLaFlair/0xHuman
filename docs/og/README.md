# 0G Integration Overview

0xHuman uses four 0G primitives. Each one solves a specific trust gap that a centralized stack can't.

| Module | Used for | Why it has to be 0G |
| :--- | :--- | :--- |
| **0G Chain** | Game escrow, INFT registry, on-chain verdicts | EVM-native settlement with sub-second finality |
| **0G Compute** | TEE-attested AI inference (Qwen 2.5 7B) | Without TEE proof, players can't trust the bot is real AI |
| **0G Storage** | Encrypted bot prompts, encrypted memory, public chat transcripts | Persistent, hash-verifiable, decentralized |
| **ERC-7857 (Agent ID)** | Bot persona ownership | Encrypted metadata + transferable + dynamic |

The Persistent Memory module and AI Alignment Nodes are roadmap items — listed but not yet integrated, as 0G hasn't shipped them publicly.

See:
- [Compute (TEE inference)](compute.md)
- [Storage (encrypted + transcripts)](storage.md)
- [Chain (game escrow)](chain.md)
