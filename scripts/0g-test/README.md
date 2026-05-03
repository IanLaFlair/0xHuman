# 0G SDK Test Scripts (Day 2 Sandbox)

Throwaway scripts to validate 0G SDK behavior empirically before committing to architecture decisions for Day 3+.

## Run order

```bash
# 1. Read-only — free, no balance needed
npx tsx scripts/0g-test/list-providers.ts

# 2. Storage roundtrip — needs ~0.001 0G for upload gas
npx tsx scripts/0g-test/storage-roundtrip.ts

# 3. Sanity contract deploy — needs ~0.05 0G for gas
npx hardhat run scripts/0g-test/deploy-sanity.cjs --network zeroGTestnet

# 4. Inference hello-world — needs ≥1 0G for sub-account funding
#    GATED on bulk faucet allocation
npx tsx scripts/0g-test/inference-helloworld.ts
```

## Network reference

- Galileo testnet RPC: `https://evmrpc-testnet.0g.ai`
- Storage indexer: `https://indexer-storage-testnet-turbo.0g.ai`
- Chain ID: 16602
- Explorer: `https://chainscan-galileo.0g.ai`
- Faucet: `https://faucet.0g.ai` (0.1 0G/day per wallet)

## Output

Each script prints a structured report. Findings get rolled up into
`docs/hackathon/0G-INTEGRATION-NOTES.md` §6 action items as they complete.
