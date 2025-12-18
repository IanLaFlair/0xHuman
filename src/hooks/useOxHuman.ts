import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import OxHumanABI from '@/contracts/OxHumanABI.json';

// Replace with actual deployed address
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}` || '0x0000000000000000000000000000000000000000';

export function useCreateGame() {
    const { writeContract, data: hash, isPending, error } = useWriteContract();

    const { isLoading: isConfirming, isSuccess: isConfirmed, data } =
        useWaitForTransactionReceipt({
            hash,
        });

    const createGame = async (stakeAmount: string) => {
        writeContract({
            address: CONTRACT_ADDRESS,
            abi: OxHumanABI,
            functionName: 'createGame',
            value: parseEther(stakeAmount),
        });
    };

    return {
        createGame,
        isPending,
        isConfirming,
        isConfirmed,
        error,
        hash,
        receipt: isConfirmed ? data : null // Expose the receipt
    };
}

export function useJoinGame() {
    const { writeContract, data: hash, isPending, error } = useWriteContract();

    const { isLoading: isConfirming, isSuccess: isConfirmed } =
        useWaitForTransactionReceipt({
            hash,
        });

    const joinGame = async (gameId: number, stakeAmount: string) => {
        writeContract({
            address: CONTRACT_ADDRESS,
            abi: OxHumanABI,
            functionName: 'joinGame',
            args: [BigInt(gameId), false], // Default to human for PvP join
            value: parseEther(stakeAmount),
        });
    };

    return {
        joinGame,
        isPending,
        isConfirming,
        isConfirmed,
        error,
        hash
    };
}

export function useGameStatus(gameId: number) {
    const { data, isError, isLoading } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: OxHumanABI,
        functionName: 'games',
        args: [BigInt(gameId)],
    });

    return { data, isError, isLoading };
}

export function useSubmitVerdict() {
    const { writeContract, data: hash, isPending, error } = useWriteContract();

    const { isLoading: isConfirming, isSuccess: isConfirmed } =
        useWaitForTransactionReceipt({
            hash,
        });

    const submitVerdict = async (gameId: number, guessedBot: boolean) => {
        writeContract({
            address: CONTRACT_ADDRESS,
            abi: OxHumanABI,
            functionName: 'submitVerdict',
            args: [BigInt(gameId), guessedBot],
        });
    };

    return {
        submitVerdict,
        isPending,
        isConfirming,
        isConfirmed,
        error,
        hash
    };
}
