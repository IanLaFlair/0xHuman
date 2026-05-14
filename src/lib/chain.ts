/**
 * 0G chain config + per-network contract addresses.
 *
 * Source of truth for the frontend's chain awareness. Keep in sync with
 * scripts/0g-test/_deployed.json (server-side) and the deployment record
 * for mainnet once we deploy.
 */

import { defineChain } from 'viem';

export const zeroGTestnet = defineChain({
    id: 16602,
    name: '0G Galileo Testnet',
    nativeCurrency: { name: '0G', symbol: '0G', decimals: 18 },
    rpcUrls: {
        default: { http: ['https://evmrpc-testnet.0g.ai'] },
        public: { http: ['https://evmrpc-testnet.0g.ai'] },
    },
    blockExplorers: {
        default: { name: 'ChainScan Galileo', url: 'https://chainscan-galileo.0g.ai' },
    },
    testnet: true,
});

export const zeroGMainnet = defineChain({
    id: 16661,
    name: '0G',
    nativeCurrency: { name: '0G', symbol: '0G', decimals: 18 },
    rpcUrls: {
        default: { http: ['https://evmrpc.0g.ai'] },
        public: { http: ['https://evmrpc.0g.ai'] },
    },
    blockExplorers: {
        default: { name: 'ChainScan', url: 'https://chainscan.0g.ai' },
    },
});

export interface DeploymentAddresses {
    OxHuman: `0x${string}`;
    BotINFT: `0x${string}`;
}

const ADDRESSES_BY_CHAIN: Record<number, DeploymentAddresses> = {
    16602: {
        // Galileo testnet — kept in sync with scripts/0g-test/_deployed.json
        OxHuman: '0x02adB0b07b53cC800b1173bceEd719426E2D5F02',
        BotINFT: '0xdFd56b56A65C44Dd0fd3CC3d85580efF93594b8e',
    },
    16661: {
        // Mainnet — deployed via scripts/launch-mainnet.cjs
        OxHuman: '0x062f1923Deb717A5d8D3e9Ed0e8C69b3eB63BC5f',
        BotINFT: '0x5298e0d0Fdf8c15538B901De4c0e9b7273957a98',
    },
};

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export function getAddresses(chainId: number): DeploymentAddresses {
    const addrs = ADDRESSES_BY_CHAIN[chainId];
    if (!addrs) {
        throw new Error(`No 0xHuman deployment configured for chain ${chainId}`);
    }
    if (addrs.OxHuman === ZERO_ADDRESS || addrs.BotINFT === ZERO_ADDRESS) {
        throw new Error(`Chain ${chainId} addresses not yet populated — run the deploy script first`);
    }
    return addrs;
}

/**
 * Default chain for the frontend. Toggle via env at build time.
 */
export const DEFAULT_CHAIN_ID = process.env.NEXT_PUBLIC_NETWORK === 'mainnet' ? 16661 : 16602;

/**
 * Block explorer base URL for the given chain. Used by every link that
 * points to an address / tx / token on 0G — keep the hardcoded testnet
 * domain (`chainscan-galileo.0g.ai`) out of the rest of the codebase.
 */
export function explorerBaseUrl(chainId: number): string {
    if (chainId === 16661) return 'https://chainscan.0g.ai';
    return 'https://chainscan-galileo.0g.ai';
}
