import { Server } from "socket.io";
import { createServer } from "http";
import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mantleSepoliaTestnet } from "viem/chains";
import * as dotenv from "dotenv";
import { getPlayerExp, awardGameExp, getExpLeaderboard, getTotalExpDistributed, getTotalPlayers, recordMatch, getMatchHistory, registerReferral } from "./exp-system";

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
    "function games(uint256) view returns (address player1, address player2, uint256 stake, uint8 status, uint8 mode, address winner, uint256 timestamp, bool isPlayer2Bot, bool player1GuessedBot, bool player1Submitted, bool player2GuessedBot, bool player2Submitted)"
]);

const httpServer = createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host}`);

    // GET /api/exp/:address - Get player EXP
    if (req.method === 'GET' && url.pathname.startsWith('/api/exp/')) {
        const address = url.pathname.split('/api/exp/')[1];
        if (address) {
            getPlayerExp(address).then(data => {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(data));
            }).catch(() => {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Failed to get EXP' }));
            });
            return;
        }
    }

    // GET /api/exp-leaderboard - Get EXP leaderboard
    if (req.method === 'GET' && url.pathname === '/api/exp-leaderboard') {
        Promise.all([getExpLeaderboard(20), getTotalExpDistributed(), getTotalPlayers()])
            .then(([leaderboard, totalExp, totalPlayers]) => {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ leaderboard, totalExp, totalPlayers }));
            }).catch(() => {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Failed to get leaderboard' }));
            });
        return;
    }

    // GET /api/match-history/:address - Get player match history
    if (req.method === 'GET' && url.pathname.startsWith('/api/match-history/')) {
        const address = url.pathname.split('/api/match-history/')[1];
        if (address) {
            getMatchHistory(address, 20).then(history => {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ history }));
            }).catch(() => {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Failed to get match history' }));
            });
            return;
        }
    }

    // POST /api/register-referral - Register a referral relationship
    if (req.method === 'POST' && url.pathname === '/api/register-referral') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { referrer, referred } = JSON.parse(body);
                if (referrer && referred) {
                    await registerReferral(referrer, referred);
                    console.log(`📎 Referral registered: ${referred.slice(0, 8)}... referred by ${referrer}`);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } else {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Missing referrer or referred' }));
                }
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Failed to register referral' }));
            }
        });
        return;
    }

    // 404 for other routes
    res.writeHead(404);
    res.end('Not Found');
});

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

// Resolution queue to prevent nonce race conditions
let isResolving = false;
const resolutionQueue: Array<{ gameId: number; p1Vote: VoteData; p2Vote: VoteData; resolve: (v: string | null) => void }> = [];

async function processResolutionQueue() {
    if (isResolving || resolutionQueue.length === 0) return;

    isResolving = true;
    const { gameId, p1Vote, p2Vote, resolve } = resolutionQueue.shift()!;

    try {
        const result = await _resolveGame(gameId, p1Vote, p2Vote);
        resolve(result);
    } catch (error) {
        console.error(`❌ Queue resolution failed for game ${gameId}:`, error);
        resolve(null);
    } finally {
        isResolving = false;
        // Process next in queue
        processResolutionQueue();
    }
}

// Public resolve function that uses queue
async function resolveGame(gameId: number, p1Vote: VoteData, p2Vote: VoteData): Promise<string | null> {
    return new Promise((resolve) => {
        resolutionQueue.push({ gameId, p1Vote, p2Vote, resolve });
        processResolutionQueue();
    });
}

// Internal resolve function (actual transaction)
async function _resolveGame(gameId: number, p1Vote: VoteData, p2Vote: VoteData): Promise<string | null> {
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

        // Wait for transaction to be confirmed before reading game data
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        console.log(`⛓️ TX confirmed in block ${receipt.blockNumber}`);

        // Award 0xP to players after successful resolution
        try {
            // Get game info from contract (now confirmed on-chain)
            const gameData = await publicClient.readContract({
                address: CONTRACT_ADDRESS,
                abi,
                functionName: "games",
                args: [BigInt(gameId)]
            }) as unknown as [string, string, bigint, number, number, string, bigint, boolean, boolean, boolean, boolean, boolean];

            // Destructure with mode at index 4, winner at index 5
            const [player1, player2, stake, status, mode, winner] = gameData;
            const stakeNumber = Number(stake) / 1e18; // Convert from wei
            const payout = stakeNumber * 1.9; // Winner gets 1.9x

            // Award 0xP based on win/loss
            const p1Won = winner.toLowerCase() === player1.toLowerCase();
            const p2Won = winner.toLowerCase() === player2.toLowerCase();

            // Award to both players and record match history
            const p1Exp = await awardGameExp(player1, p1Won, stakeNumber);
            await recordMatch(parseInt(gameId), player1, player2, stakeNumber, p1Won, p1Exp, p1Won ? payout : 0);

            if (player2 !== "0x0000000000000000000000000000000000000000") {
                const p2Exp = await awardGameExp(player2, p2Won, stakeNumber);
                await recordMatch(parseInt(gameId), player2, player1, stakeNumber, p2Won, p2Exp, p2Won ? payout : 0);
            }

            console.log(`🎮 0xP awarded for game ${gameId}!`);
        } catch (expError: any) {
            console.error(`⚠️ Failed to award 0xP:`, expError.message);
            // Don't fail the whole resolution if 0xP fails
        }

        return hash;
    } catch (error: any) {
        console.error(`❌ Failed to resolve game ${gameId}:`, error.message);
        return null;
    }
}

io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("join_game", async (data: { gameId: string; playerAddress: string } | string) => {
        // Handle both old format (just gameId) and new format (object with gameId and playerAddress)
        const gameId = typeof data === 'string' ? data : data.gameId;
        const playerAddress = typeof data === 'string' ? null : data.playerAddress;

        // If playerAddress provided, validate against contract
        if (playerAddress) {
            try {
                const gameData = await publicClient.readContract({
                    address: CONTRACT_ADDRESS,
                    abi,
                    functionName: "games",
                    args: [BigInt(gameId)],
                }) as any;

                const player1 = gameData[0]?.toLowerCase();
                const player2 = gameData[1]?.toLowerCase();
                const userAddr = playerAddress.toLowerCase();
                // Hardcode HouseVault address for reliable validation
                const houseVaultAddress = "0xe2f21988c31ffd66c4d24fba63f529dbd5db7442";
                const resolverAddress = account.address.toLowerCase();

                console.log(`   🔍 Validation: p2=${player2}, hv=${houseVaultAddress}, match=${player2 === houseVaultAddress}`);

                // Check if game exists (player1 != 0x0)
                const isValidGame = player1 !== '0x0000000000000000000000000000000000000000';
                // Check if user is a player OR if they are the creator waiting for opponent
                const isPlayer = userAddr === player1 || userAddr === player2;
                // Allow creator even if player2 hasn't joined yet
                const isCreatorWaiting = userAddr === player1 && player2 === '0x0000000000000000000000000000000000000000';
                // NEW: Allow resolver to join PvE games (where player2 = HouseVault)
                const isResolverInPvE = userAddr === resolverAddress && player2 === houseVaultAddress;
                // NEW: Allow resolver to pre-join Open games (they're about to join via joinGameAsHouse)
                const gameStatus = gameData[3]; // Status enum: 0=Open, 1=Active, 2=Resolved
                const isResolverJoiningOpen = userAddr === resolverAddress && gameStatus === 0;

                if (!isValidGame) {
                    console.log(`❌ Game ${gameId} does not exist. Denying access.`);
                    socket.emit("access_denied", { reason: "Game does not exist" });
                    return;
                }

                if (!isPlayer && !isCreatorWaiting && !isResolverInPvE && !isResolverJoiningOpen) {
                    console.log(`❌ Address ${playerAddress} is not a player in game ${gameId}. Denying access.`);
                    socket.emit("access_denied", { reason: "Not a player in this game" });
                    return;
                }
            } catch (error: any) {
                console.error(`Error validating player access:`, error.message);
                // Allow access on error (fail open for UX, but log for monitoring)
            }
        }

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
            const isPlayer2Bot = gameData[7]; // isPlayer2Bot from contract (index shifted after mode field)
            const houseVaultAddress = "0xe2f21988c31ffd66c4d24fba63f529dbd5db7442";
            const resolverAddress = account.address.toLowerCase();
            const isPvE = player2 === houseVaultAddress;
            const isResolverVoting = voterAddress === resolverAddress;

            if (voterAddress === player1) {
                votes.p1 = voteData;
                console.log(`✓ P1 vote stored for game ${gameId}`);

                // If P2 is a bot and hasn't voted yet, emit special event to trigger immediate bot vote
                if (isPlayer2Bot && !votes.p2) {
                    console.log(`🤖 P2 is bot, signaling bot to vote immediately...`);
                    io.to(gameId.toString()).emit("botVoteNeeded", { gameId, urgency: "immediate" });
                }
            } else if (voterAddress === player2 || (isPvE && isResolverVoting)) {
                // Accept vote from player2 OR from resolver in PvE games (where player2 is HouseVault)
                votes.p2 = voteData;
                console.log(`✓ P2 vote stored for game ${gameId}${isPvE ? ' (resolver acting as house)' : ''}`);
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
