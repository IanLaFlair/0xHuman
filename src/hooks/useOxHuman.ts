import { useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient, useAccount, useChainId } from 'wagmi';
import OxHumanABI from '../contracts/OxHumanABI.json';
import { parseEther } from 'viem';
import { getAddresses, DEFAULT_CHAIN_ID } from '@/lib/chain';

/**
 * Resolve the OxHuman contract address for the connected chain. Falls back
 * to the default-chain deployment when wallet isn't connected to a known
 * 0G network.
 */
function useContractAddress(): `0x${string}` {
    const chainId = useChainId();
    try {
        return getAddresses(chainId).OxHuman;
    } catch {
        return getAddresses(DEFAULT_CHAIN_ID).OxHuman;
    }
}

// Hook for creating a game
export function useCreateGame() {
    const CONTRACT_ADDRESS = useContractAddress();
    const { writeContract, data: hash, isPending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed, data: receipt } =
        useWaitForTransactionReceipt({ hash });

    const createGame = async (stakeAmount: string) => {
        writeContract({
            address: CONTRACT_ADDRESS,
            abi: OxHumanABI,
            functionName: 'createGame',
            value: parseEther(stakeAmount),
        });
    };

    return { createGame, isPending, isConfirming, isConfirmed, hash, receipt, error };
}

// Hook for joining a game (PvP only — bot routing happens via convertToPvE
// from the resolver, never invoked from the frontend)
export function useJoinGame() {
    const CONTRACT_ADDRESS = useContractAddress();
    const { writeContract, data: hash, isPending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed, data: receipt } =
        useWaitForTransactionReceipt({ hash });

    const joinGame = async (gameId: number, stakeAmount: string) => {
        writeContract({
            address: CONTRACT_ADDRESS,
            abi: OxHumanABI,
            functionName: 'joinGame',
            args: [BigInt(gameId)],
            value: parseEther(stakeAmount),
        });
    };

    return { joinGame, isPending, isConfirming, isConfirmed, hash, receipt, error };
}

// Hook for submitting a verdict
export function useSubmitVerdict() {
    const CONTRACT_ADDRESS = useContractAddress();
    const { writeContract, data: hash, isPending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed, data: receipt } =
        useWaitForTransactionReceipt({ hash });

    const submitVerdict = (gameId: number, guessedBot: boolean) => {
        writeContract({
            address: CONTRACT_ADDRESS,
            abi: OxHumanABI,
            functionName: 'submitVerdict',
            args: [BigInt(gameId), guessedBot],
        });
    };

    return { submitVerdict, isPending, isConfirming, isConfirmed, hash, receipt, error };
}

// Hook for reading game status
export function useGameStatus(gameId: number) {
    const CONTRACT_ADDRESS = useContractAddress();
    const { data, isLoading, error, refetch } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: OxHumanABI,
        functionName: 'games',
        args: [BigInt(gameId)],
        query: {
            refetchInterval: 3000,
        },
    });

    return { data, isLoading, error, refetch };
}

// Hook for reading game count
export function useGameCount() {
    const CONTRACT_ADDRESS = useContractAddress();
    const { data, isLoading, error } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: OxHumanABI,
        functionName: 'gameCount',
    });

    return { data, isLoading, error };
}

// Hook for reading winnings balance
export function useWinningsBalance(address: `0x${string}` | undefined) {
    const CONTRACT_ADDRESS = useContractAddress();
    const { data, isLoading, error, refetch } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: OxHumanABI,
        functionName: 'winnings',
        args: address ? [address] : undefined,
        query: {
            enabled: !!address,
            refetchInterval: 2000,
        },
    });

    return { data, isLoading, error, refetch };
}

// Hook for claiming winnings
export function useClaimWinnings() {
    const CONTRACT_ADDRESS = useContractAddress();
    const { writeContract, data: hash, isPending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed, data: receipt } =
        useWaitForTransactionReceipt({ hash });

    const claimWinnings = async () => {
        writeContract({
            address: CONTRACT_ADDRESS,
            abi: OxHumanABI,
            functionName: 'claimWinnings',
        });
    };

    return { claimWinnings, isPending, isConfirming, isConfirmed, hash, receipt, error };
}

// Hook for finding a match (Open PvP games available to join)
export function useFindMatch() {
    const CONTRACT_ADDRESS = useContractAddress();
    const publicClient = usePublicClient();
    const { address } = useAccount();

    const findMatch = async (stakeAmount: string): Promise<number | null> => {
        if (!publicClient) return null;
        try {
            const count = await publicClient.readContract({
                address: CONTRACT_ADDRESS,
                abi: OxHumanABI,
                functionName: 'gameCount',
            }) as bigint;
            const totalGames = Number(count);
            const stakeWei = parseEther(stakeAmount);
            const limit = Math.max(0, totalGames - 10);

            for (let i = totalGames - 1; i >= limit; i--) {
                const game = await publicClient.readContract({
                    address: CONTRACT_ADDRESS,
                    abi: OxHumanABI,
                    functionName: 'games',
                    args: [BigInt(i)],
                }) as any;
                // game tuple: [player1, player2, botTokenId, stake, status, mode, winner, ...]
                // Status enum: 0=Open, 1=Active, 2=Resolved
                if (game[4] === 0 && game[3] === stakeWei && game[0] !== address) {
                    return i;
                }
            }
        } catch (error) {
            console.error('Error finding match:', error);
        }
        return null;
    };

    return { findMatch };
}

// Default export for backward compatibility
export function useOxHuman() {
    const create = useCreateGame();
    const join = useJoinGame();
    const verdict = useSubmitVerdict();
    const count = useGameCount();

    return {
        createGame: create.createGame,
        joinGame: join.joinGame,
        submitVerdict: verdict.submitVerdict,
        gameCount: count.data,
        isPending: create.isPending,
        isConfirming: create.isConfirming,
        isConfirmed: create.isConfirmed,
        hash: create.hash,
        error: create.error,
    };
}
