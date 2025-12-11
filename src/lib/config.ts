import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mantle, mantleSepoliaTestnet } from 'wagmi/chains';

export const config = getDefaultConfig({
    appName: '0xHuman',
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
    chains: [mantle, mantleSepoliaTestnet],
    ssr: true, // If your dApp uses server side rendering (SSR)
});
