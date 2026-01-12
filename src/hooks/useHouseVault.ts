'use client';

import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import HouseVaultArtifact from '@/contracts/HouseVaultABI.json';

const HouseVaultABI = HouseVaultArtifact.abi;

// Contract address - update this after deployment
const HOUSE_VAULT_ADDRESS = process.env.NEXT_PUBLIC_HOUSE_VAULT_ADDRESS as `0x${string}` || '0xf50Cac50BAE7c6261c85485FFffc9468dd93eB86';

// Read pool stats
export function usePoolStats() {
    const { data: totalAssets, refetch: refetchAssets } = useReadContract({
        address: HOUSE_VAULT_ADDRESS,
        abi: HouseVaultABI,
        functionName: 'totalAssets',
    });

    const { data: totalShares, refetch: refetchTotalShares } = useReadContract({
        address: HOUSE_VAULT_ADDRESS,
        abi: HouseVaultABI,
        functionName: 'totalShares',
    });

    const { data: maxBet, refetch: refetchMaxBet } = useReadContract({
        address: HOUSE_VAULT_ADDRESS,
        abi: HouseVaultABI,
        functionName: 'maxBet',
    });

    const refetch = () => {
        refetchAssets();
        refetchTotalShares();
        refetchMaxBet();
    };

    return {
        tvl: totalAssets ? formatEther(totalAssets as bigint) : '0',
        totalShares: totalShares ? (totalShares as bigint).toString() : '0',
        maxBet: maxBet ? formatEther(maxBet as bigint) : '0',
        refetch,
    };
}

// Read user's position
export function useUserPosition() {
    const { address } = useAccount();

    const { data: userShares, refetch: refetchShares } = useReadContract({
        address: HOUSE_VAULT_ADDRESS,
        abi: HouseVaultABI,
        functionName: 'shares',
        args: [address],
        query: { enabled: !!address },
    });

    const { data: userBalance, refetch: refetchBalance } = useReadContract({
        address: HOUSE_VAULT_ADDRESS,
        abi: HouseVaultABI,
        functionName: 'balanceOf',
        args: [address],
        query: { enabled: !!address },
    });

    const { data: sharePercent, refetch: refetchPercent } = useReadContract({
        address: HOUSE_VAULT_ADDRESS,
        abi: HouseVaultABI,
        functionName: 'sharePercent',
        args: [address],
        query: { enabled: !!address },
    });

    const refetch = () => {
        refetchShares();
        refetchBalance();
        refetchPercent();
    };

    return {
        shares: userShares ? (userShares as bigint).toString() : '0',
        balance: userBalance ? formatEther(userBalance as bigint) : '0',
        // Contract returns (shares * 1e18 * 100) / totalShares, divide by 1e18 to get actual percentage
        sharePercent: sharePercent ? (Number(sharePercent as bigint) / 1e18).toString() : '0',
        refetch,
    };
}

// Deposit hook
export function useDeposit() {
    const { writeContract, data: hash, isPending, isError, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed, data: receipt } = useWaitForTransactionReceipt({ hash });

    const deposit = (amount: string) => {
        writeContract({
            address: HOUSE_VAULT_ADDRESS,
            abi: HouseVaultABI,
            functionName: 'deposit',
            value: parseEther(amount),
        });
    };

    return {
        deposit,
        isPending,
        isConfirming,
        isConfirmed,
        isError,
        error,
        hash,
        receipt,
    };
}

// Withdraw hook
export function useWithdraw() {
    const { writeContract, data: hash, isPending, isError, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed, data: receipt } = useWaitForTransactionReceipt({ hash });
    const { data: userShares } = useReadContract({
        address: HOUSE_VAULT_ADDRESS,
        abi: HouseVaultABI,
        functionName: 'shares',
        args: [useAccount().address],
    });

    const withdraw = (shares: string) => {
        writeContract({
            address: HOUSE_VAULT_ADDRESS,
            abi: HouseVaultABI,
            functionName: 'withdraw',
            args: [BigInt(shares)],
        });
    };

    const withdrawAll = () => {
        writeContract({
            address: HOUSE_VAULT_ADDRESS,
            abi: HouseVaultABI,
            functionName: 'withdrawAll',
        });
    };

    return {
        withdraw,
        withdrawAll,
        userShares: userShares ? (userShares as bigint).toString() : '0',
        isPending,
        isConfirming,
        isConfirmed,
        isError,
        error,
        hash,
        receipt,
    };
}

// Preview deposit (how many shares will be minted)
export function usePreviewDeposit(amount: string) {
    const { data: shares } = useReadContract({
        address: HOUSE_VAULT_ADDRESS,
        abi: HouseVaultABI,
        functionName: 'previewDeposit',
        args: [parseEther(amount || '0')],
        query: { enabled: !!amount && parseFloat(amount) > 0 },
    });

    return shares ? (shares as bigint).toString() : '0';
}

// Preview withdraw (how much MNT will be received)
export function usePreviewWithdraw(shares: string) {
    const { data: assets } = useReadContract({
        address: HOUSE_VAULT_ADDRESS,
        abi: HouseVaultABI,
        functionName: 'previewRedeem',
        args: [BigInt(shares || '0')],
        query: { enabled: !!shares && parseFloat(shares) > 0 },
    });

    return assets ? formatEther(assets as bigint) : '0';
}
