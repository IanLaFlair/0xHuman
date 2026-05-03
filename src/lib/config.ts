import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { zeroGMainnet, zeroGTestnet } from './chain';

export const config = getDefaultConfig({
    appName: '0xHuman',
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
    chains: [zeroGMainnet, zeroGTestnet],
    ssr: true,
});
