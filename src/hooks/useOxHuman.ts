import { useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient, useAccount } from 'wagmi';
import OxHumanArtifact from '../contracts/OxHumanABI.json';
const OxHumanABI = OxHumanArtifact.abi;
import { parseEther } from 'viem';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}` || '0x0000000000000000000000000000000000000000';

// Hook for creating a game
export function useCreateGame() {
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

// Hook for joining a game
export function useJoinGame() {
    const { writeContract, data: hash, isPending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed, data: receipt } =
        useWaitForTransactionReceipt({ hash });

    const joinGame = async (gameId: number, stakeAmount: string) => {
        // Note: isBot param is hardcoded to false for now as this is for human players
        writeContract({
            address: CONTRACT_ADDRESS,
            abi: OxHumanABI,
            functionName: 'joinGame',
            args: [BigInt(gameId), false],
            value: parseEther(stakeAmount),
        });
    };

    return { joinGame, isPending, isConfirming, isConfirmed, hash, receipt, error };
}

// Hook for submitting a verdict
export function useSubmitVerdict() {
    const { writeContract, data: hash, isPending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed, data: receipt } =
        useWaitForTransactionReceipt({ hash });

    const submitVerdict = (gameId: number, guessedBot: boolean) => {
        console.log(`Submitting verdict for game ${gameId}...`);
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
    const { data, isLoading, error, refetch } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: OxHumanABI,
        functionName: 'games',
        args: [BigInt(gameId)],
        query: {
            refetchInterval: 3000, // Poll every 3 seconds (reduced from 1s to prevent 429 rate limiting)
        },
    });

    return { data, isLoading, error, refetch };
}

// Hook for reading game count
export function useGameCount() {
    const { data, isLoading, error } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: OxHumanABI,
        functionName: 'gameCount',
    });

    return { data, isLoading, error };
}

// [NEW] Hook for reading winnings balance
export function useWinningsBalance(address: `0x${string}` | undefined) {
    const { data, isLoading, error, refetch } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: OxHumanABI,
        functionName: 'winnings',
        args: address ? [address] : undefined,
        query: {
            enabled: !!address,
            refetchInterval: 2000, // Poll every 2 seconds
        },
    });

    return { data, isLoading, error, refetch };
}

// [NEW] Hook for claiming winnings
export function useClaimWinnings() {
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

// Hook for finding a match
export function useFindMatch() {
    const publicClient = usePublicClient();
    const { address } = useAccount();

    const findMatch = async (stakeAmount: string): Promise<number | null> => {
        if (!publicClient) return null;

        try {
            // Get total game count
            const count = await publicClient.readContract({
                address: CONTRACT_ADDRESS,
                abi: OxHumanABI,
                functionName: 'gameCount',
            }) as bigint;

            const totalGames = Number(count);
            const stakeWei = parseEther(stakeAmount);

            // Search backwards from the latest game (limit to last 10 for performance)
            const limit = Math.max(0, totalGames - 10);

            for (let i = totalGames - 1; i >= limit; i--) {
                const game = await publicClient.readContract({
                    address: CONTRACT_ADDRESS,
                    abi: OxHumanABI,
                    functionName: 'games',
                    args: [BigInt(i)],
                }) as any;

                // Check if game is WAITING (status 0), has correct stake, and I am not the creator
                // game structure: [player1, player2, stake, status, winner, timestamp, isPlayer2Bot, ...]
                // status 0 = Waiting
                if (game[3] === 0 && game[2] === stakeWei && game[0] !== address) {
                    return i; // Found a match!
                }
            }
        } catch (error) {
            console.error("Error finding match:", error);
        }

        return null; // No match found
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
