import { createWalletClient, createPublicClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mantleSepoliaTestnet } from 'viem/chains';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

if (!PRIVATE_KEY || !CONTRACT_ADDRESS) {
    console.error("❌ Missing PRIVATE_KEY or NEXT_PUBLIC_CONTRACT_ADDRESS in .env.local");
    process.exit(1);
}

// Setup Clients
const account = privateKeyToAccount(PRIVATE_KEY);

const client = createPublicClient({
    chain: mantleSepoliaTestnet,
    transport: http()
});

const wallet = createWalletClient({
    account,
    chain: mantleSepoliaTestnet,
    transport: http()
});

// Load ABI
const abiPath = path.resolve(process.cwd(), 'src/contracts/OxHumanABI.json');
const ABI = JSON.parse(fs.readFileSync(abiPath, 'utf8'));

async function main() {
    console.log(`\n🤖 0xHuman Bot Agent Online`);
    console.log(`📍 Address: ${account.address}`);
    console.log(`🎯 Contract: ${CONTRACT_ADDRESS}`);
    console.log(`Waiting for targets...\n`);

    // Start polling loop
    scanAndJoin();
}

async function scanAndJoin() {
    try {
        // 1. Get Game Count
        const count = await client.readContract({
            address: CONTRACT_ADDRESS,
            abi: ABI,
            functionName: 'gameCount',
            args: [], // Explicit empty args to satisfy type check
        }) as bigint;

        const totalGames = Number(count);
        console.log(`Scanning... Total Games: ${totalGames}`);

        if (totalGames === 0) return;

        // 2. Scan last 5 games
        const limit = Math.max(0, totalGames - 5);

        for (let i = totalGames - 1; i >= limit; i--) {
            const game = await client.readContract({
                address: CONTRACT_ADDRESS,
                abi: ABI,
                functionName: 'games',
                args: [BigInt(i)],
            }) as any;

            // Game Struct: [player1, player2, stake, status, ...]
            // Status 0 = Waiting
            const player1 = game[0];
            const status = Number(game[3]); // Convert to Number
            const stake = game[2];

            console.log(`Checking Game #${i}: Status=${status}, Player1=${player1}`);

            // Logic: If Waiting AND I am not Player 1
            if (status === 0 && player1.toLowerCase() !== account.address.toLowerCase()) {
                console.log(`Found Target: Game #${i} | Stake: ${stake} wei`);

                // Join Game
                console.log(`🚀 Joining Game #${i}...`);
                const hash = await wallet.writeContract({
                    address: CONTRACT_ADDRESS,
                    abi: ABI,
                    functionName: 'joinGame',
                    args: [BigInt(i), true], // isBot = true
                    value: stake
                });

                console.log(`✅ Tx Sent: ${hash}`);
            }
        }
    } catch (error) {
        console.error("Error in scan loop:", error);
    } finally {
        // Schedule next scan after current one completes
        setTimeout(scanAndJoin, 5000);
    }
}

main();
