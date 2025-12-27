import { Server } from "socket.io";
import { createServer } from "http";
import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mantleSepoliaTestnet } from "viem/chains";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;
const RESOLVER_PRIVATE_KEY = process.env.RESOLVER_PRIVATE_KEY as `0x${string}`;

// Check for required env vars
if (!CONTRACT_ADDRESS) {
    console.error("❌ NEXT_PUBLIC_CONTRACT_ADDRESS not set in .env.local");
    process.exit(1);
}
if (!RESOLVER_PRIVATE_KEY) {
    console.error("❌ RESOLVER_PRIVATE_KEY not set in .env.local");
    console.log("  Add: RESOLVER_PRIVATE_KEY=0x<your_private_key>");
    process.exit(1);
}

// Setup viem clients
const account = privateKeyToAccount(RESOLVER_PRIVATE_KEY);
const publicClient = createPublicClient({
    chain: mantleSepoliaTestnet,
    transport: http("https://rpc.sepolia.mantle.xyz"),
});
const walletClient = createWalletClient({
    account,
    chain: mantleSepoliaTestnet,
    transport: http("https://rpc.sepolia.mantle.xyz"),
});

console.log(`🔑 Resolver wallet: ${account.address}`);
console.log(`📜 Contract: ${CONTRACT_ADDRESS}`);

// ABI for resolveWithSignatures
const abi = parseAbi([
    "function resolveWithSignatures(uint256 _gameId, bool _p1GuessedBot, bytes _p1Signature, bool _p2GuessedBot, bytes _p2Signature) external",
    "function games(uint256) view returns (address player1, address player2, uint256 stake, uint8 status, address winner, uint256 timestamp, bool isPlayer2Bot, bool player1GuessedBot, bool player1Submitted, bool player2GuessedBot, bool player2Submitted)"
]);

const httpServer = createServer();
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

console.log("🔌 0xHuman Nervous System (Socket.io) starting...");

// Store active game rooms
const rooms = new Map();

// Store votes with signatures per game
interface VoteData {
    guessedBot: boolean;
    signature: string;
    playerAddress: string;
}
const gameVotes = new Map<number, { p1?: VoteData; p2?: VoteData }>();

// Resolve game with collected signatures
async function resolveGame(gameId: number, p1Vote: VoteData, p2Vote: VoteData): Promise<string | null> {
    try {
        console.log(`🎯 Resolving game ${gameId}...`);

        const hash = await walletClient.writeContract({
            address: CONTRACT_ADDRESS,
            abi,
            functionName: "resolveWithSignatures",
            args: [
                BigInt(gameId),
                p1Vote.guessedBot,
                p1Vote.signature as `0x${string}`,
                p2Vote.guessedBot,
                p2Vote.signature as `0x${string}`
            ],
        });

        console.log(`✅ Game ${gameId} resolved! TX: ${hash}`);
        return hash;
    } catch (error: any) {
        console.error(`❌ Failed to resolve game ${gameId}:`, error.message);
        return null;
    }
}

io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("join_game", (gameId) => {
        socket.join(gameId.toString());
        console.log(`User ${socket.id} joined game ${gameId}`);

        if (!rooms.has(gameId)) {
            rooms.set(gameId, { players: new Set() });
        }
        const room = rooms.get(gameId)!;
        room.players.add(socket.id);

        if (room.players.size === 2) {
            io.to(gameId.toString()).emit("opponent_joined", {
                gameId,
                message: "Match found! Game starting..."
            });
            console.log(`🎮 Game ${gameId} now has 2 players - match started!`);
        }

        socket.to(gameId.toString()).emit("system_message", {
            text: "A new entity has entered the arena."
        });
    });

    // Handle signed vote submission
    socket.on("submitSignedVote", async (data: { gameId: number; playerAddress: string; guessedBot: boolean; signature: string }) => {
        const { gameId, playerAddress, guessedBot, signature } = data;
        console.log(`📥 Received vote for game ${gameId} from ${playerAddress}: ${guessedBot ? "BOT" : "HUMAN"}`);

        try {
            // Get game info to determine if P1 or P2
            const gameData = await publicClient.readContract({
                address: CONTRACT_ADDRESS,
                abi,
                functionName: "games",
                args: [BigInt(gameId)],
            }) as any;

            const player1 = gameData[0].toLowerCase();
            const player2 = gameData[1].toLowerCase();
            const voterAddress = playerAddress.toLowerCase();

            // Initialize votes storage for this game
            if (!gameVotes.has(gameId)) {
                gameVotes.set(gameId, {});
            }
            const votes = gameVotes.get(gameId)!;

            // Store vote based on player
            const voteData: VoteData = { guessedBot, signature, playerAddress };
            const isPlayer2Bot = gameData[6]; // isPlayer2Bot from contract

            if (voterAddress === player1) {
                votes.p1 = voteData;
                console.log(`✓ P1 vote stored for game ${gameId}`);

                // If P2 is a bot and hasn't voted yet, emit special event to trigger immediate bot vote
                if (isPlayer2Bot && !votes.p2) {
                    console.log(`🤖 P2 is bot, signaling bot to vote immediately...`);
                    io.to(gameId.toString()).emit("botVoteNeeded", { gameId, urgency: "immediate" });
                }
            } else if (voterAddress === player2) {
                votes.p2 = voteData;
                console.log(`✓ P2 vote stored for game ${gameId}`);
            } else {
                console.error(`❌ Address ${playerAddress} is not a player in game ${gameId}`);
                socket.emit("voteError", { error: "Not a player in this game" });
                return;
            }

            // Emit vote received confirmation
            socket.emit("voteReceived", { gameId, success: true });
            // Also broadcast to room so bot can hear if needed
            io.to(gameId.toString()).emit("voteReceived", { gameId, success: true });

            // If both have voted, resolve the game
            if (votes.p1 && votes.p2) {
                console.log(`🔄 Both players voted in game ${gameId}, resolving...`);

                const txHash = await resolveGame(gameId, votes.p1, votes.p2);

                if (txHash) {
                    // Broadcast to all players in game
                    io.to(gameId.toString()).emit("gameResolved", {
                        gameId,
                        txHash,
                        p1GuessedBot: votes.p1.guessedBot,
                        p2GuessedBot: votes.p2.guessedBot
                    });
                    console.log(`📢 Broadcasted resolution for game ${gameId}`);
                } else {
                    io.to(gameId.toString()).emit("resolveError", {
                        gameId,
                        error: "Failed to resolve game on-chain"
                    });
                }

                // Cleanup
                gameVotes.delete(gameId);
            }
        } catch (error: any) {
            console.error(`Error processing vote:`, error.message);
            socket.emit("voteError", { error: error.message });
        }
    });

    socket.on("typing", ({ gameId, sender, isTyping }) => {
        socket.to(gameId.toString()).emit("typing", { sender, isTyping });
    });

    socket.on("chat_message", ({ gameId, text, sender }) => {
        console.log(`[${gameId}] ${sender}: ${text}`);
        io.to(gameId.toString()).emit("chat_message", {
            id: Date.now(),
            gameId,
            sender,
            text,
            timestamp: Date.now()
        });
    });

    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
    console.log(`🚀 Nervous System running on port ${PORT}`);
});
