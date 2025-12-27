// Debug script to check game state on-chain
import { createPublicClient, http, formatEther } from 'viem';
import { mantleSepoliaTestnet } from 'viem/chains';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

// Load env - ES module compatible
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

// Minimal ABI for reading game state
const ABI = [
    {
        "inputs": [{ "name": "", "type": "uint256" }],
        "name": "games",
        "outputs": [
            { "name": "player1", "type": "address" },
            { "name": "player2", "type": "address" },
            { "name": "stake", "type": "uint256" },
            { "name": "status", "type": "uint8" },
            { "name": "winner", "type": "address" },
            { "name": "timestamp", "type": "uint256" },
            { "name": "isPlayer2Bot", "type": "bool" },
            { "name": "player1GuessedBot", "type": "bool" },
            { "name": "player1Submitted", "type": "bool" },
            { "name": "player2GuessedBot", "type": "bool" },
            { "name": "player2Submitted", "type": "bool" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "gameCount",
        "outputs": [{ "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    }
] as const;

async function main() {
    const gameId = parseInt(process.argv[2] || '15');

    console.log('Contract Address:', CONTRACT_ADDRESS);
    console.log('Checking Game ID:', gameId);
    console.log('---');

    const client = createPublicClient({
        chain: mantleSepoliaTestnet,
        transport: http('https://rpc.sepolia.mantle.xyz'),
    });

    try {
        const gameCount = await client.readContract({
            address: CONTRACT_ADDRESS,
            abi: ABI,
            functionName: 'gameCount',
        });
        console.log('Total Games:', gameCount.toString());

        const game = await client.readContract({
            address: CONTRACT_ADDRESS,
            abi: ABI,
            functionName: 'games',
            args: [BigInt(gameId)],
        });

        console.log('\n=== Game State ===');
        console.log('Player 1:', game[0]);
        console.log('Player 2:', game[1]);
        console.log('Stake:', formatEther(game[2]), 'MNT');
        console.log('Status:', ['Open', 'Active', 'Resolved'][game[3]] || game[3]);
        console.log('Winner:', game[4]);
        console.log('Timestamp:', new Date(Number(game[5]) * 1000).toISOString());
        console.log('isPlayer2Bot:', game[6]);
        console.log('P1 GuessedBot:', game[7]);
        console.log('P1 Submitted:', game[8]);
        console.log('P2 GuessedBot:', game[9]);
        console.log('P2 Submitted:', game[10]);

        // Check if game can accept verdict
        console.log('\n=== Analysis ===');
        if (game[3] !== 1) {
            console.log('❌ Game is NOT Active - cannot submit verdict');
            console.log('   Status is:', ['Open', 'Active', 'Resolved'][game[3]]);
        } else {
            console.log('✅ Game is Active');
        }

        if (game[8]) console.log('⚠️ Player 1 already submitted verdict');
        if (game[10]) console.log('⚠️ Player 2 already submitted verdict');

    } catch (error) {
        console.error('Error reading contract:', error);
    }
}

main();
