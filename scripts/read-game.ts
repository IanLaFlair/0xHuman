import { createPublicClient, http } from 'viem';
import { mantleSepoliaTestnet } from 'viem/chains';

const CONTRACT_ADDRESS = '0x3dd55b82A3Cbd8cB57a7Eb8cB92D437004720B3B';

const ABI = [
    {
        "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "name": "games",
        "outputs": [
            { "internalType": "address", "name": "player1", "type": "address" },
            { "internalType": "address", "name": "player2", "type": "address" },
            { "internalType": "uint256", "name": "stake", "type": "uint256" },
            { "internalType": "uint8", "name": "status", "type": "uint8" },
            { "internalType": "address", "name": "winner", "type": "address" },
            { "internalType": "uint256", "name": "timestamp", "type": "uint256" },
            { "internalType": "bool", "name": "isPlayer2Bot", "type": "bool" },
            { "internalType": "bool", "name": "player1GuessedBot", "type": "bool" },
            { "internalType": "bool", "name": "player1Submitted", "type": "bool" },
            { "internalType": "bool", "name": "player2GuessedBot", "type": "bool" },
            { "internalType": "bool", "name": "player2Submitted", "type": "bool" }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

const client = createPublicClient({
    chain: mantleSepoliaTestnet,
    transport: http("https://rpc.sepolia.mantle.xyz"),
});

async function readGame(gameId: number) {
    console.log(`\n========== GAME #${gameId} ==========\n`);

    const game = await client.readContract({
        address: CONTRACT_ADDRESS,
        abi: ABI,
        functionName: 'games',
        args: [BigInt(gameId)],
    }) as any;

    const statusMap: { [key: number]: string } = {
        0: 'WAITING',
        1: 'ACTIVE',
        2: 'RESOLVED'
    };

    console.log('Player 1:', game[0]);
    console.log('Player 2:', game[1]);
    console.log('Stake:', Number(game[2]) / 1e18, 'MNT');
    console.log('Status:', statusMap[Number(game[3])] || game[3]);
    console.log('Winner:', game[4]);
    console.log('Is Player2 Bot:', game[6]);
    console.log('');
    console.log('=== VOTES (ON-CHAIN PROOF) ===');
    console.log('P1 Guessed Bot:', game[7], game[7] ? '→ Voted BOT' : '→ Voted HUMAN');
    console.log('P1 Submitted:', game[8]);
    console.log('P2 Guessed Bot:', game[9], game[9] ? '→ Voted BOT' : '→ Voted HUMAN');
    console.log('P2 Submitted:', game[10]);
    console.log('\n================================\n');
}

// Read game from command line arg, default to game 7
const gameId = parseInt(process.argv[2]) || 7;
readGame(gameId).catch(console.error);
