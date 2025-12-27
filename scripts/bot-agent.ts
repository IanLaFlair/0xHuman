import { createPublicClient, createWalletClient, http, parseEther, formatEther, keccak256, encodePacked } from 'viem';
import { privateKeyToAccount, signMessage } from 'viem/accounts';
import { mantleSepoliaTestnet } from 'viem/chains';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { io } from "socket.io-client";
import { generateReply } from './ai-brain.ts'; // Note: .js extension for ESM

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;
const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;

if (!PRIVATE_KEY) {
    console.error("❌ PRIVATE_KEY not found in .env");
    process.exit(1);
}

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

// ABI for GameCreated event and joinGame function
const ABI = [
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "uint256", "name": "gameId", "type": "uint256" },
            { "indexed": true, "internalType": "address", "name": "player1", "type": "address" },
            { "indexed": false, "internalType": "uint256", "name": "stake", "type": "uint256" },
            { "indexed": false, "internalType": "bool", "name": "isPlayer2Bot", "type": "bool" }
        ],
        "name": "GameCreated",
        "type": "event"
    },
    {
        "inputs": [
            { "internalType": "uint256", "name": "gameId", "type": "uint256" },
            { "internalType": "bool", "name": "isBot", "type": "bool" }
        ],
        "name": "joinGame",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "gameCount",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
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
            { "internalType": "bool", "name": "player1Submitted", "type": "bool" }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

// Socket.io Connection
const socket = io("http://localhost:3001");

// Track game states
const gameStates = new Map<string, { hasReceivedMessage: boolean, hasGreeted: boolean, hasVoted: boolean }>();

// Track games bot has joined (for voting detection)
const botGames = new Set<number>();

socket.on("connect", () => {
    console.log("🔌 Bot connected to Nervous System (Socket.io)");
});

// Listen for when human player votes - bot should vote too
socket.on("voteReceived", async (data: { gameId: number, success: boolean }) => {
    const gameId = data.gameId;
    const state = gameStates.get(gameId.toString());

    // Only vote if this is a bot game and we haven't voted yet
    if (botGames.has(gameId) && state && !state.hasVoted) {
        console.log(`🗳️ Human voted in game ${gameId}, bot will vote too...`);

        // Mark as voted to prevent double voting
        state.hasVoted = true;
        gameStates.set(gameId.toString(), state);

        // Add human-like delay (1-3 seconds)
        const voteDelay = 1000 + Math.random() * 2000;

        setTimeout(async () => {
            try {
                // Bot randomly guesses (50/50) - AI doesn't actually know if opponent is human
                const guessedBot = Math.random() > 0.5;

                // Create message hash that matches contract's abi.encodePacked format
                const messageHash = keccak256(
                    encodePacked(
                        ['uint256', 'bool', 'string'],
                        [BigInt(gameId), guessedBot, 'VOTE']
                    )
                );

                // Sign the hash with bot's private key
                const signature = await signMessage({
                    message: { raw: messageHash },
                    privateKey: PRIVATE_KEY
                });

                console.log(`🤖 Bot voting in game ${gameId}: ${guessedBot ? 'BOT' : 'HUMAN'}`);

                // Submit signed vote to server
                socket.emit('submitSignedVote', {
                    gameId,
                    playerAddress: account.address,
                    guessedBot,
                    signature
                });

            } catch (error: any) {
                console.error(`❌ Bot vote failed for game ${gameId}:`, error.message);
            }
        }, voteDelay);
    }
});

socket.on("chat_message", async (msg: any) => {
    // Ignore own messages
    if (msg.sender === 'bot') return;

    // Mark as received message so we don't auto-greet later
    const state = gameStates.get(msg.gameId.toString()) || { hasReceivedMessage: false, hasGreeted: false, hasVoted: false };
    state.hasReceivedMessage = true;
    gameStates.set(msg.gameId.toString(), state);

    console.log(`📩 Received message in game ${msg.gameId}: ${msg.text}`);

    // 1. Simulate "Reading Time" (2-4 seconds) before starting to type
    const readingDelay = 2000 + Math.random() * 2000;

    setTimeout(async () => {
        // Emit Typing Indicator
        socket.emit("typing", { gameId: msg.gameId, sender: 'bot', isTyping: true });

        // 2. Call AI Brain (Latency here acts as "thinking time")
        const reply = await generateReply(msg.text);
        console.log(`🤖 Bot replying: ${reply}`);

        // 3. Simulate "Typing Speed" (e.g., 50ms per char)
        const typingDuration = Math.min(3000, 500 + (reply.length * 30));

        setTimeout(() => {
            // Stop typing
            socket.emit("typing", { gameId: msg.gameId, sender: 'bot', isTyping: false });

            // Send Message
            socket.emit("chat_message", {
                gameId: msg.gameId,
                text: reply,
                sender: 'bot'
            });
        }, typingDuration);

    }, readingDelay);
});

async function scanOpenGames() {
    try {
        console.log("DEBUG: Inside scanOpenGames function");
        console.log("🔍 Scanning for open games...");
        const count = await client.readContract({
            address: CONTRACT_ADDRESS,
            abi: ABI,
            functionName: 'gameCount',
            args: [],
        }) as bigint;

        const totalGames = Number(count);
        console.log(`   Total Games: ${totalGames}`);

        if (totalGames === 0) return;

        // Scan last 5 games
        const limit = Math.max(0, totalGames - 5);

        for (let i = totalGames - 1; i >= limit; i--) {
            const game = await client.readContract({
                address: CONTRACT_ADDRESS,
                abi: ABI,
                functionName: 'games',
                args: [BigInt(i)],
            }) as any;

            // Game Struct: [player1, player2, stake, status, ...]
            const player1 = game[0];
            const player2 = game[1];
            const status = Number(game[3]); // 0 = Waiting
            const stake = game[2];
            const timestamp = Number(game[5]); // Unix timestamp when game was created

            // Note: isPlayer2Bot is always false on creation in current contract.
            // We skip checking it so the bot can actually join games.
            // We check if player2 is empty (0x000...) to ensure it's open.
            const isOpen = status === 0 && player2 === '0x0000000000000000000000000000000000000000';

            // Check if game is old enough (15 seconds) - give humans time to match first
            const currentTime = Math.floor(Date.now() / 1000);
            const gameAge = currentTime - timestamp;
            const MIN_AGE_TO_JOIN = 15; // seconds

            console.log(`   > Checking Game #${i}: Status=${status}, Age=${gameAge}s, P1=${player1}`);

            if (isOpen && player1.toLowerCase() !== account.address.toLowerCase() && gameAge >= MIN_AGE_TO_JOIN) {
                console.log(`⚡ Found Open Game #${i} (${gameAge}s old) | Stake: ${formatEther(stake)} MNT`);

                // Join Socket Room
                socket.emit("join_game", i.toString());

                // Join Contract
                console.log(`   Joining Game #${i}...`);
                try {
                    const hash = await wallet.writeContract({
                        address: CONTRACT_ADDRESS,
                        abi: ABI,
                        functionName: 'joinGame',
                        args: [BigInt(i), true], // isBot = true
                        value: stake
                    });
                    console.log(`✅ Transaction sent: ${hash}`);

                    // Track this as a bot game for voting
                    botGames.add(i);

                    // Initialize Game State
                    gameStates.set(i.toString(), { hasReceivedMessage: false, hasGreeted: false, hasVoted: false });

                    // Schedule Proactive Greeting (e.g., 5-8 seconds after joining)
                    const greetingDelay = 5000 + Math.random() * 3000;
                    setTimeout(async () => {
                        const state = gameStates.get(i.toString());
                        if (state && !state.hasReceivedMessage && !state.hasGreeted) {
                            console.log(`⚡ Initiating conversation for game ${i}...`);

                            // Mark as greeted so we don't double greet
                            state.hasGreeted = true;
                            gameStates.set(i.toString(), state);

                            // Emit Typing
                            socket.emit("typing", { gameId: i.toString(), sender: 'bot', isTyping: true });

                            // Generate Opener
                            const opener = await generateReply("start a conversation. say something casual to the other player.");
                            console.log(`🤖 Bot starting chat: ${opener}`);

                            const typingDuration = Math.min(3000, 500 + (opener.length * 30));

                            setTimeout(() => {
                                socket.emit("typing", { gameId: i.toString(), sender: 'bot', isTyping: false });
                                socket.emit("chat_message", {
                                    gameId: i.toString(),
                                    text: opener,
                                    sender: 'bot'
                                });
                            }, typingDuration);
                        }
                    }, greetingDelay);

                } catch (error) {
                    console.error(`❌ Failed to join game ${i}:`, error);
                }
            }
        }
    } catch (error) {
        console.error("❌ Error scanning games:", error);
    }
}

async function main() {
    console.log(`🤖 Bot Agent Starting...`);
    console.log(`Address: ${account.address}`);

    // Initial Scan & Polling
    console.log("DEBUG: Starting polling loop...");

    const runScan = async () => {
        await scanOpenGames();
        setTimeout(runScan, 2000); // Poll every 2 seconds
    };
    runScan();

    console.log(`Listening for GameCreated events on ${CONTRACT_ADDRESS}...`);

    client.watchContractEvent({
        address: CONTRACT_ADDRESS,
        abi: ABI,
        eventName: 'GameCreated',
        onLogs: async (logs) => {
            for (const log of logs) {
                const { gameId, stake, isPlayer2Bot } = log.args as any;

                console.log(`\n🆕 New Game Detected: ID ${gameId}`);
                console.log(`   Stake: ${formatEther(stake)} MNT`);

                // Random delay 8-15s before joining to normalize waiting times
                // This prevents players from detecting AI vs Human based on timing
                const joinDelay = 8000 + Math.random() * 7000; // 8-15 seconds
                console.log(`⏳ Waiting ${(joinDelay / 1000).toFixed(1)}s before joining...`);

                // Join the Socket.io room for this game first (so we can listen for chat)
                socket.emit("join_game", gameId.toString());

                // Schedule the actual join after delay
                setTimeout(async () => {
                    try {
                        // Re-check if game is still open (human might have joined)
                        const game = await client.readContract({
                            address: CONTRACT_ADDRESS,
                            abi: ABI,
                            functionName: 'games',
                            args: [gameId],
                        }) as any;

                        const player2 = game[1];
                        const status = Number(game[3]);
                        const isStillOpen = status === 0 && player2 === '0x0000000000000000000000000000000000000000';

                        if (!isStillOpen) {
                            console.log(`🚫 Game ${gameId} already has a player. Skipping.`);
                            return;
                        }

                        console.log(`⚡ Now joining Game ${gameId}...`);

                        const hash = await wallet.writeContract({
                            address: CONTRACT_ADDRESS,
                            abi: ABI,
                            functionName: 'joinGame',
                            args: [gameId, true], // isBot = true
                            value: stake
                        });
                        console.log(`✅ Transaction sent: ${hash}`);

                        // Track this as a bot game for voting
                        botGames.add(Number(gameId));

                        // Initialize Game State
                        gameStates.set(gameId.toString(), { hasReceivedMessage: false, hasGreeted: false, hasVoted: false });

                        // Schedule Proactive Greeting (e.g., 5-8 seconds after joining)
                        const greetingDelay = 5000 + Math.random() * 3000;
                        setTimeout(async () => {
                            const state = gameStates.get(gameId.toString());
                            if (state && !state.hasReceivedMessage && !state.hasGreeted) {
                                console.log(`⚡ Initiating conversation for game ${gameId}...`);

                                // Mark as greeted so we don't double greet
                                state.hasGreeted = true;
                                gameStates.set(gameId.toString(), state);

                                // Emit Typing
                                socket.emit("typing", { gameId: gameId.toString(), sender: 'bot', isTyping: true });

                                // Generate Opener
                                const opener = await generateReply("start a conversation. say something casual to the other player.");
                                console.log(`🤖 Bot starting chat: ${opener}`);

                                const typingDuration = Math.min(3000, 500 + (opener.length * 30));

                                setTimeout(() => {
                                    socket.emit("typing", { gameId: gameId.toString(), sender: 'bot', isTyping: false });
                                    socket.emit("chat_message", {
                                        gameId: gameId.toString(),
                                        text: opener,
                                        sender: 'bot'
                                    });
                                }, typingDuration);
                            }
                        }, greetingDelay);

                    } catch (error) {
                        console.error(`❌ Failed to join game:`, error);
                    }
                }, joinDelay); // End of setTimeout for delayed join
            }
        }
    });
}

main().catch(console.error);

