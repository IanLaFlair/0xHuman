/**
 * 0xHuman backend — 0G Chain edition.
 *
 * Single Node process that owns:
 *   - HTTP REST API (EXP, leaderboard, match history, referrals)
 *   - Socket.io for real-time match orchestration
 *   - Resolver wallet that submits signed votes + matchmaker actions
 *   - PvE bot session (lib/0g-compute via scripts/ai-brain) — replaces the
 *     separate bot-agent.ts process from the Mantle build
 *   - Post-match flow: upload chat transcript → 0G Storage, update bot
 *     memory → 0G Storage, anchor hash on-chain via OxHuman.anchorChatLog
 */

import { Server } from 'socket.io';
import { createServer } from 'http';
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import {
    getPlayerExp,
    awardGameExp,
    getExpLeaderboard,
    getTotalExpDistributed,
    getTotalPlayers,
    recordMatch,
    getMatchHistory,
    registerReferral,
} from './exp-system.ts';
import {
    BotSession,
    createBotSession,
    listAvailablePersonas,
} from './scripts/ai-brain.ts';
import {
    configFromPrivateKey as storageConfigFromPrivateKey,
    uploadJSON,
    uploadEncrypted,
    downloadEncrypted,
    type StorageConfig,
} from './lib/0g-storage.ts';
import {
    type BotMemory,
    emptyMemory,
    appendMatch,
    type MatchOutcome,
} from './lib/bot-memory.ts';
import {
    configFromPrivateKey as computeConfigFromPrivateKey,
    type ComputeConfig,
} from './lib/0g-compute.ts';
import { extractLesson } from './lib/lesson-extractor.ts';

dotenv.config({ path: '.env.local' });

// ============ Env ============

const RESOLVER_PRIVATE_KEY = process.env.RESOLVER_PRIVATE_KEY ?? process.env.PRIVATE_KEY;
const NETWORK = (process.env.NETWORK ?? 'testnet') as 'testnet' | 'mainnet';
const RPC_URL = NETWORK === 'mainnet' ? 'https://evmrpc.0g.ai' : 'https://evmrpc-testnet.0g.ai';
const CHAIN_ID = NETWORK === 'mainnet' ? 16661 : 16602;
const PERSONA_KEY_HEX = process.env.PERSONA_KEY; // 64-hex symmetric key for prompt decryption

// Contract addresses come from a deployment record file written by the deploy
// script. Override via env if needed.
const DEPLOYED_PATH = path.resolve(process.cwd(), 'scripts/0g-test/_deployed.json');
function loadAddresses(): { OxHuman: string; BotINFT: string } {
    if (process.env.OXHUMAN_ADDRESS && process.env.BOTINFT_ADDRESS) {
        return {
            OxHuman: process.env.OXHUMAN_ADDRESS,
            BotINFT: process.env.BOTINFT_ADDRESS,
        };
    }
    if (!fs.existsSync(DEPLOYED_PATH)) {
        throw new Error(
            `No deployment record at ${DEPLOYED_PATH}. Run scripts/0g-test/deploy-full.cjs first ` +
                `or set OXHUMAN_ADDRESS + BOTINFT_ADDRESS env vars.`,
        );
    }
    const record = JSON.parse(fs.readFileSync(DEPLOYED_PATH, 'utf8'));
    return {
        OxHuman: record.contracts.OxHuman,
        BotINFT: record.contracts.BotINFT,
    };
}

if (!RESOLVER_PRIVATE_KEY) {
    console.error('❌ RESOLVER_PRIVATE_KEY (or PRIVATE_KEY) required in .env.local');
    process.exit(1);
}

const { OxHuman: OXHUMAN_ADDRESS, BotINFT: BOTINFT_ADDRESS } = loadAddresses();

console.log(`🌐 Network:    ${NETWORK} (chainId ${CHAIN_ID})`);
console.log(`📜 OxHuman:   ${OXHUMAN_ADDRESS}`);
console.log(`🤖 BotINFT:   ${BOTINFT_ADDRESS}`);

// ============ Chain setup ============

const provider = new ethers.JsonRpcProvider(RPC_URL);
const resolverWallet = new ethers.Wallet(RESOLVER_PRIVATE_KEY, provider);
console.log(`🔑 Resolver:  ${resolverWallet.address}`);

const oxhumanAbi = [
    'function createGame() external payable',
    'function joinGame(uint256 gameId) external payable',
    'function createGamePvE(uint256 botTokenId) external payable',
    'function convertToPvE(uint256 gameId, uint256 botTokenId) external',
    'function submitVerdict(uint256 gameId, bool guessedBot) external',
    'function resolveWithSignatures(uint256 gameId, bool p1GuessedBot, bytes p1Signature, bool p2GuessedBot, bytes p2Signature) external',
    'function anchorChatLog(uint256 gameId, bytes32 hash, string uri) external',
    'function claimWinnings() external',
    'function games(uint256) view returns (address player1, address player2, uint256 botTokenId, uint256 stake, uint8 status, uint8 mode, address winner, uint256 timestamp, bool isPlayer2Bot, bool player1GuessedBot, bool player1Submitted, bool player2GuessedBot, bool player2Submitted, bytes32 chatLogHash, string chatLogURI)',
    'function gameCount() view returns (uint256)',
    'event GameCreated(uint256 indexed gameId, address indexed player1, uint256 stake, uint8 mode)',
    'event GameJoined(uint256 indexed gameId, address indexed player2, uint256 botTokenId)',
];
const botAbi = [
    'function bots(uint256) view returns (bytes32 personalityHash, string personalityURI, bytes32 memoryHash, string memoryURI, uint256 vaultBalance, uint256 lastDepositBlock, uint64 wins, uint64 losses, uint8 slot, uint8 tier)',
    'function updateMemory(uint256 tokenId, string memoryURI, bytes32 memoryHash) external',
    'function nextTokenId() view returns (uint256)',
    'function ownerOf(uint256 tokenId) view returns (address)',
];

const oxhuman = new ethers.Contract(OXHUMAN_ADDRESS, oxhumanAbi, resolverWallet);
const botContract = new ethers.Contract(BOTINFT_ADDRESS, botAbi, resolverWallet);

// ============ Storage config ============

const storageCfg: StorageConfig = storageConfigFromPrivateKey(RESOLVER_PRIVATE_KEY, NETWORK);
const computeCfg: ComputeConfig = computeConfigFromPrivateKey(RESOLVER_PRIVATE_KEY, NETWORK);
const personaKey = PERSONA_KEY_HEX ? Buffer.from(PERSONA_KEY_HEX, 'hex') : null;

// ============ Hash → persona-meta lookup ============

interface PersonaMeta {
    slug: string;          // 'mochi' | 'skibidi' | ... | 'custom'
    name: string;
    tagline?: string;
    color?: string;
    custom: boolean;
}

const HASH_MAP_PATH = path.resolve(process.cwd(), 'data/_persona-hashmap.json');
const hashToMeta = new Map<string, PersonaMeta>();

function loadHashMap(): void {
    if (!fs.existsSync(HASH_MAP_PATH)) return;
    try {
        const raw = JSON.parse(fs.readFileSync(HASH_MAP_PATH, 'utf8'));
        for (const [k, v] of Object.entries(raw)) hashToMeta.set(k.toLowerCase(), v as PersonaMeta);
    } catch {
        // ignore corrupt file
    }
}

function persistHashMap(): void {
    const obj: Record<string, PersonaMeta> = {};
    for (const [k, v] of hashToMeta.entries()) obj[k] = v;
    fs.writeFileSync(HASH_MAP_PATH, JSON.stringify(obj, null, 2));
}

function recordHashMapping(hash: string, meta: PersonaMeta): void {
    hashToMeta.set(hash.toLowerCase(), meta);
    persistHashMap();
}

function lookupHashMapping(hash: string): PersonaMeta | null {
    return hashToMeta.get(hash.toLowerCase()) ?? null;
}

/**
 * Pre-populate hashes for built-in personas at boot so /bots/my can resolve
 * them even before someone hits /api/personas/upload.
 */
function seedBuiltInPersonas(): void {
    for (const slug of listAvailablePersonas()) {
        try {
            const filePath = path.resolve(process.cwd(), `data/personas/${slug}.json`);
            const persona = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const hash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(persona))).toLowerCase();
            if (!hashToMeta.has(hash)) {
                hashToMeta.set(hash, {
                    slug,
                    name: persona.name,
                    tagline: persona.tagline,
                    color: persona.color,
                    custom: false,
                });
            }
        } catch (e) {
            console.warn(`seedBuiltInPersonas(${slug}) failed:`, (e as Error).message);
        }
    }
    persistHashMap();
}

loadHashMap();
seedBuiltInPersonas();

// ============ Match state ============

interface MatchTranscriptEntry {
    ts: number;
    sender: 'p1' | 'p2' | 'system';
    text: string;
}

interface VoteData {
    guessedBot: boolean;
    signature: string;
    playerAddress: string;
}

interface MatchState {
    gameId: number;
    botTokenId: number | null;     // set after convertToPvE for PvE matches
    botSession: BotSession | null; // set after convertToPvE
    transcript: MatchTranscriptEntry[];
    votes: { p1?: VoteData; p2?: VoteData };
    matchmakerTimer: NodeJS.Timeout | null;
    createdAt: number;
}

const matches = new Map<number, MatchState>();
const playerSockets = new Map<string, string>(); // address → socketId

// Resolution queue (prevents nonce conflicts)
let isResolving = false;
const resolutionQueue: Array<{ gameId: number; resolve: (txHash: string | null) => void }> = [];

// ============ HTTP server ============

const httpServer = createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host}`);

    if (req.method === 'GET' && url.pathname.startsWith('/api/exp/')) {
        const address = url.pathname.split('/api/exp/')[1];
        if (address) {
            getPlayerExp(address)
                .then((data) => {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(data));
                })
                .catch(() => {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Failed to get EXP' }));
                });
            return;
        }
    }

    if (req.method === 'GET' && url.pathname === '/api/exp-leaderboard') {
        Promise.all([getExpLeaderboard(20), getTotalExpDistributed(), getTotalPlayers()])
            .then(([leaderboard, totalExp, totalPlayers]) => {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ leaderboard, totalExp, totalPlayers }));
            })
            .catch(() => {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Failed to get leaderboard' }));
            });
        return;
    }

    if (req.method === 'GET' && url.pathname.startsWith('/api/match-history/')) {
        const address = url.pathname.split('/api/match-history/')[1];
        if (address) {
            getMatchHistory(address, 20)
                .then((history) => {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ history }));
                })
                .catch(() => {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Failed to get match history' }));
                });
            return;
        }
    }

    // GET /api/personas/list — public catalog (no system prompts)
    if (req.method === 'GET' && url.pathname === '/api/personas/list') {
        try {
            const slugs = listAvailablePersonas();
            const personas = slugs.map((slug) => {
                const filePath = path.resolve(process.cwd(), `data/personas/${slug}.json`);
                const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                // Return only public fields — system prompt stays server-side
                return {
                    slug,
                    name: raw.name,
                    tagline: raw.tagline,
                    color: raw.color,
                    avatar: raw.avatar,
                };
            });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ personas }));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to list personas' }));
        }
        return;
    }

    // POST /api/personas/upload — encrypt + upload a persona by slug, return URI + hash
    if (req.method === 'POST' && url.pathname === '/api/personas/upload') {
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', async () => {
            try {
                const { slug } = JSON.parse(body);
                if (!slug || typeof slug !== 'string') {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Missing slug' }));
                    return;
                }
                if (!personaKey) {
                    res.writeHead(503, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'PERSONA_KEY not configured on server' }));
                    return;
                }
                const filePath = path.resolve(process.cwd(), `data/personas/${slug}.json`);
                if (!fs.existsSync(filePath)) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: `Persona ${slug} not found` }));
                    return;
                }
                const persona = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                const upload = await uploadEncrypted(storageCfg, persona, personaKey);
                const uri = `og-storage://${upload.rootHash}`;
                const hash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(persona)));
                recordHashMapping(hash, { slug, name: persona.name, tagline: persona.tagline, color: persona.color, custom: false });
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ uri, hash, rootHash: upload.rootHash, txHash: upload.txHash }));
            } catch (e: any) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message ?? 'Upload failed' }));
            }
        });
        return;
    }

    // POST /api/personas/upload-custom — accept user-authored persona, encrypt + upload, return URI + hash
    if (req.method === 'POST' && url.pathname === '/api/personas/upload-custom') {
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', async () => {
            try {
                const { name, tagline, color, systemPrompt, voiceParameters } = JSON.parse(body);
                if (!name || !systemPrompt) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'name and systemPrompt are required' }));
                    return;
                }
                if (typeof systemPrompt !== 'string' || systemPrompt.length > 4000) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'systemPrompt must be 1..4000 chars' }));
                    return;
                }
                if (!personaKey) {
                    res.writeHead(503, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'PERSONA_KEY not configured on server' }));
                    return;
                }
                const persona = {
                    name: String(name).slice(0, 32),
                    tagline: String(tagline ?? '').slice(0, 120),
                    color: typeof color === 'string' ? color.slice(0, 16) : '#7C7C7C',
                    avatar: undefined,
                    systemPrompt,
                    voiceParameters: voiceParameters ?? { temperature: 0.85, maxTokens: 80 },
                };
                const upload = await uploadEncrypted(storageCfg, persona, personaKey);
                const uri = `og-storage://${upload.rootHash}`;
                const hash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(persona)));
                recordHashMapping(hash, { slug: 'custom', name: persona.name, tagline: persona.tagline, color: persona.color, custom: true });
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ uri, hash, rootHash: upload.rootHash, txHash: upload.txHash }));
            } catch (e: any) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message ?? 'Upload failed' }));
            }
        });
        return;
    }

    // GET /api/personas/by-hash?h=<hash> — resolve a personalityHash to its persona meta
    if (req.method === 'GET' && url.pathname === '/api/personas/by-hash') {
        const hash = url.searchParams.get('h')?.toLowerCase();
        if (!hash) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing h' }));
            return;
        }
        const meta = lookupHashMapping(hash);
        if (!meta) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'No persona known for that hash' }));
            return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(meta));
        return;
    }

    if (req.method === 'POST' && url.pathname === '/api/register-referral') {
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', async () => {
            try {
                const { referrer, referred } = JSON.parse(body);
                if (referrer && referred) {
                    await registerReferral(referrer, referred);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } else {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Missing referrer or referred' }));
                }
            } catch {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Failed to register referral' }));
            }
        });
        return;
    }

    res.writeHead(404);
    res.end('Not Found');
});

// ============ Helpers ============

async function getGameOnChain(gameId: number): Promise<any> {
    return await oxhuman.games(BigInt(gameId));
}

/**
 * Pick a random bot token id eligible for matchmaking. Excludes bots whose
 * vault can't cover the player's stake.
 *
 * For hackathon: enumerate from 1 to nextTokenId-1 and pick first that
 * satisfies. In production, maintain an indexed list with proper sampling.
 */
async function pickRandomBot(stake: bigint): Promise<number | null> {
    try {
        const next = (await botContract.nextTokenId()) as bigint;
        const total = Number(next) - 1;
        if (total <= 0) return null;

        // Shuffle indices for random pick
        const ids = Array.from({ length: total }, (_, i) => i + 1);
        for (let i = ids.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [ids[i], ids[j]] = [ids[j], ids[i]];
        }

        for (const id of ids) {
            const b = await botContract.bots(BigInt(id));
            const vault = b.vaultBalance as bigint;
            // maxStake = 10% of vault
            const maxStake = vault / 10n;
            if (stake <= maxStake && stake > 0n) return id;
        }
        return null;
    } catch (e) {
        console.error('pickRandomBot error:', (e as Error).message);
        return null;
    }
}

/**
 * Read the persona slug used by a particular bot token. For hackathon we
 * map tokenId → persona slug deterministically (tokenIds 1..N map to the
 * minted personas in data/_minted-personas.json).
 *
 * Returns null if the mapping isn't available — caller should fall back
 * to a default persona or refuse to host the match.
 */
function loadMintedMapping(): Record<string, string> {
    const mintedPath = path.resolve(process.cwd(), 'data/_minted-personas.json');
    if (!fs.existsSync(mintedPath)) return {};
    try {
        const record = JSON.parse(fs.readFileSync(mintedPath, 'utf8'));
        const mapping: Record<string, string> = {};
        for (const m of record.minted ?? []) {
            mapping[String(m.tokenId)] = (m.persona as string).toLowerCase();
        }
        return mapping;
    } catch {
        return {};
    }
}

const mintedMapping = loadMintedMapping();

function personaSlugForBot(tokenId: number): string {
    return mintedMapping[String(tokenId)] ?? 'mochi';
}

/**
 * Fetch + decrypt + parse a bot's memory blob from 0G Storage.
 * Returns empty memory if not yet set or decryption fails.
 */
async function loadBotMemory(tokenId: number): Promise<BotMemory> {
    try {
        const b = await botContract.bots(BigInt(tokenId));
        const memoryURI = b.memoryURI as string;
        if (!memoryURI || !personaKey) return emptyMemory(tokenId);

        const rootHash = memoryURI.replace('og-storage://', '');
        const result = await downloadEncrypted<BotMemory>(storageCfg, rootHash, personaKey);
        return result.data;
    } catch (e) {
        console.warn(`loadBotMemory(${tokenId}) failed, using empty:`, (e as Error).message);
        return emptyMemory(tokenId);
    }
}

/**
 * Persist bot memory: encrypt → upload to 0G Storage → call updateMemory.
 */
async function persistBotMemory(tokenId: number, memory: BotMemory): Promise<void> {
    if (!personaKey) {
        console.warn('PERSONA_KEY not set — skipping memory persistence');
        return;
    }
    const upload = await uploadEncrypted(storageCfg, memory, personaKey);
    const memoryURI = `og-storage://${upload.rootHash}`;
    const memoryHash = '0x' + ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(memory))).slice(2);
    const tx = await botContract.updateMemory(BigInt(tokenId), memoryURI, memoryHash);
    await tx.wait();
    console.log(`💾 Bot ${tokenId} memory updated: ${memoryURI}`);
}

/**
 * Upload chat transcript to 0G Storage and anchor the hash on-chain.
 */
async function persistTranscript(gameId: number, transcript: MatchTranscriptEntry[]): Promise<{ uri: string; hash: string } | null> {
    try {
        const blob = { gameId, transcript, anchoredAt: Date.now() };
        const upload = await uploadJSON(storageCfg, blob);
        const uri = `og-storage://${upload.rootHash}`;
        const hash = '0x' + ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(blob))).slice(2);
        const tx = await oxhuman.anchorChatLog(BigInt(gameId), hash, uri);
        await tx.wait();
        console.log(`📜 Game ${gameId} transcript anchored: ${uri}`);
        return { uri, hash };
    } catch (e) {
        console.error(`persistTranscript(${gameId}) failed:`, (e as Error).message);
        return null;
    }
}

// ============ Matchmaker ============

const MATCHMAKER_TIMEOUT_MS = 12_000; // 8-15s window — picks 12s as a stable default

async function startMatchmakerTimer(gameId: number, stake: bigint): Promise<void> {
    const state = matches.get(gameId);
    if (!state) return;

    state.matchmakerTimer = setTimeout(async () => {
        // Check on-chain — did a human join in the meantime?
        try {
            const game = await getGameOnChain(gameId);
            const player2 = (game.player2 as string).toLowerCase();
            if (player2 !== ethers.ZeroAddress.toLowerCase()) {
                console.log(`🤝 Game ${gameId}: human opponent joined, bot stays out.`);
                return;
            }
        } catch {
            // proceed anyway
        }

        const tokenId = await pickRandomBot(stake);
        if (tokenId === null) {
            console.log(`⚠️  Game ${gameId}: no eligible bot found. Match stalls (player can cancel).`);
            return;
        }

        try {
            // Kick off the on-chain convert and the off-chain bot-prep in parallel.
            // Memory load from 0G Storage takes ~10-15s; tx confirmation also takes
            // ~5-10s. Running them concurrently saves a lot of dead time before the
            // bot can greet.
            const slug = personaSlugForBot(tokenId);
            const memoryPromise = loadBotMemory(tokenId);
            const gameOnChainPromise = getGameOnChain(gameId);

            const tx = await oxhuman.convertToPvE(BigInt(gameId), BigInt(tokenId));
            const [memory, game] = await Promise.all([memoryPromise, gameOnChainPromise]);
            await tx.wait();
            console.log(`🤖 Game ${gameId}: converted to PvE with bot ${tokenId}`);

            const opponent = (game.player1 as string).toLowerCase();
            const session = createBotSession({ personaSlug: slug, memory, opponent });
            state.botTokenId = tokenId;
            state.botSession = session;

            // Tell the frontend that the bot is ready to chat. The frontend
            // delays the 60s match timer until this fires so memory-loading
            // latency doesn't burn through visible turn time.
            io.to(gameId.toString()).emit('opponent_joined', {
                gameId,
                message: 'A new entity has entered the arena.',
            });
            io.to(gameId.toString()).emit('bot_ready', { gameId });

            // Bot greets after a human-ish delay
            setTimeout(() => sendBotReply(gameId, '__OPENER__'), 5000 + Math.random() * 3000);
        } catch (e) {
            console.error(`convertToPvE(${gameId}, ${tokenId}) failed:`, (e as Error).message);
        }
    }, MATCHMAKER_TIMEOUT_MS);
}

// ============ Bot orchestration ============

async function sendBotReply(gameId: number, userMessage: string): Promise<void> {
    const state = matches.get(gameId);
    if (!state || !state.botSession) return;

    // Typing indicator + reading delay (1.5-3s)
    io.to(gameId.toString()).emit('typing', { sender: 'bot', isTyping: true });
    await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1500));

    const isOpener = userMessage === '__OPENER__';
    const promptInput = isOpener
        ? 'start a casual conversation. say something brief to the other player.'
        : userMessage;

    const result = await state.botSession.reply(promptInput);

    // Typing duration scales with reply length
    const typingMs = Math.min(3000, 500 + result.text.length * 30);
    await new Promise((r) => setTimeout(r, typingMs));

    io.to(gameId.toString()).emit('typing', { sender: 'bot', isTyping: false });
    io.to(gameId.toString()).emit('chat_message', {
        id: Date.now(),
        gameId,
        sender: 'bot',
        text: result.text,
        timestamp: Date.now(),
        // Inference attestation — visible only after reveal but recorded per turn
        meta: { chatId: result.chatId, verified: result.verified, mocked: result.mocked },
    });

    // Track in transcript
    state.transcript.push({ ts: Date.now(), sender: 'p2', text: result.text });
}

// ============ Vote resolution ============

async function processResolutionQueue(): Promise<void> {
    if (isResolving || resolutionQueue.length === 0) return;
    isResolving = true;
    const { gameId, resolve } = resolutionQueue.shift()!;
    try {
        const txHash = await _resolveGame(gameId);
        resolve(txHash);
    } catch (e) {
        console.error(`Resolution queue error for game ${gameId}:`, (e as Error).message);
        resolve(null);
    } finally {
        isResolving = false;
        processResolutionQueue();
    }
}

function queueResolution(gameId: number): Promise<string | null> {
    return new Promise((resolve) => {
        resolutionQueue.push({ gameId, resolve });
        processResolutionQueue();
    });
}

async function _resolveGame(gameId: number): Promise<string | null> {
    const state = matches.get(gameId);
    if (!state || !state.votes.p1 || !state.votes.p2) return null;

    try {
        console.log(`🎯 Resolving game ${gameId}…`);
        const tx = await oxhuman.resolveWithSignatures(
            BigInt(gameId),
            state.votes.p1.guessedBot,
            state.votes.p1.signature,
            state.votes.p2.guessedBot,
            state.votes.p2.signature,
        );
        const rcpt = await tx.wait();
        console.log(`✅ Game ${gameId} resolved in tx ${rcpt.hash}`);

        // EXP awarding (keep PostgreSQL flow)
        try {
            const game = await getGameOnChain(gameId);
            const stakeNumber = Number(game.stake) / 1e18;
            const player1 = game.player1 as string;
            const player2 = game.player2 as string;
            const winner = (game.winner as string).toLowerCase();
            const p1Won = winner === player1.toLowerCase();
            const p2Won = winner === player2.toLowerCase();
            const payout = p1Won || p2Won ? stakeNumber * 1.85 : 0;

            const p1Exp = await awardGameExp(player1, p1Won, stakeNumber);
            await recordMatch(gameId, player1, player2, stakeNumber, p1Won, p1Exp, p1Won ? payout : 0);

            if (player2 !== ethers.ZeroAddress && state.botTokenId === null) {
                // Real human P2
                const p2Exp = await awardGameExp(player2, p2Won, stakeNumber);
                await recordMatch(gameId, player2, player1, stakeNumber, p2Won, p2Exp, p2Won ? payout : 0);
            }

            // PvE post-match: persist transcript + bot memory
            if (state.botTokenId !== null) {
                await persistTranscript(gameId, state.transcript);

                // Best-effort: ask Qwen to summarise what the player did so the bot
                // accumulates a real lessons playbook over time. Failures don't
                // block resolution — memory just gets the stats update without a lesson.
                let lesson: string | null = null;
                try {
                    const personaName = state.botSession?.persona.name ?? 'AI bot';
                    lesson = await extractLesson(computeCfg, state.transcript, {
                        botPersonaName: personaName,
                        botWon: p2Won,
                    });
                    if (lesson) console.log(`📚 Lesson for bot ${state.botTokenId}: ${lesson}`);
                } catch (e) {
                    console.warn(`Lesson extraction failed for ${gameId}:`, (e as Error).message);
                }

                // Update bot memory (with lesson appended if extraction succeeded)
                const newMemory = appendMatch(state.botSession?.memory ?? emptyMemory(state.botTokenId), {
                    matchId: gameId,
                    opponent: player1,
                    botWon: p2Won,
                    stake: stakeNumber,
                    lesson: lesson ?? undefined,
                    ts: Date.now(),
                } as MatchOutcome);
                await persistBotMemory(state.botTokenId, newMemory);
            }
        } catch (postErr) {
            console.error(`Post-match handler failed for ${gameId}:`, (postErr as Error).message);
        }

        return rcpt.hash;
    } catch (e) {
        console.error(`Resolution failed for game ${gameId}:`, (e as Error).message);
        return null;
    }
}

// ============ Socket.io ============

const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
});

console.log('🔌 0xHuman backend Socket.io ready');

io.on('connection', (socket) => {
    console.log(`+ socket ${socket.id}`);

    socket.on('join_game', async (data: { gameId: string | number; playerAddress?: string }) => {
        const gameId = Number(data.gameId);
        socket.join(gameId.toString());
        if (data.playerAddress) playerSockets.set(data.playerAddress.toLowerCase(), socket.id);

        // Initialize match state if new
        if (!matches.has(gameId)) {
            const game = await getGameOnChain(gameId).catch(() => null);
            if (!game) {
                socket.emit('access_denied', { reason: 'Game does not exist' });
                return;
            }
            const isOpenPvP = Number(game.status) === 0; // GameStatus.Open
            matches.set(gameId, {
                gameId,
                botTokenId: null,
                botSession: null,
                transcript: [],
                votes: {},
                matchmakerTimer: null,
                createdAt: Date.now(),
            });

            // If this is an Open PvP game and the joiner is the creator,
            // start the matchmaker timer to potentially route to a bot
            if (isOpenPvP && data.playerAddress?.toLowerCase() === (game.player1 as string).toLowerCase()) {
                const stake = game.stake as bigint;
                console.log(`⏱️  Game ${gameId}: starting ${MATCHMAKER_TIMEOUT_MS}ms matchmaker timer`);
                startMatchmakerTimer(gameId, stake);
            }
        }
    });

    socket.on('chat_message', async (data: { gameId: number | string; text: string; sender: string }) => {
        const gameId = Number(data.gameId);
        const state = matches.get(gameId);
        if (!state) return;

        // Echo to room
        io.to(gameId.toString()).emit('chat_message', {
            id: Date.now(),
            gameId,
            sender: data.sender,
            text: data.text,
            timestamp: Date.now(),
        });

        // Track in transcript
        state.transcript.push({ ts: Date.now(), sender: data.sender === 'bot' ? 'p2' : 'p1', text: data.text });

        // If PvE, trigger bot reply
        if (state.botSession && data.sender !== 'bot') {
            sendBotReply(gameId, data.text).catch((e) =>
                console.error(`bot reply failed:`, (e as Error).message),
            );
        }
    });

    socket.on('typing', (data: { gameId: number | string; sender: string; isTyping: boolean }) => {
        socket.to(String(data.gameId)).emit('typing', { sender: data.sender, isTyping: data.isTyping });
    });

    socket.on(
        'submitSignedVote',
        async (data: { gameId: number; playerAddress: string; guessedBot: boolean; signature: string }) => {
            const { gameId, playerAddress, guessedBot, signature } = data;
            const state = matches.get(gameId);
            if (!state) {
                socket.emit('voteError', { error: 'Match not found' });
                return;
            }

            try {
                const game = await getGameOnChain(gameId);
                const player1 = (game.player1 as string).toLowerCase();
                const player2 = (game.player2 as string).toLowerCase();
                const voter = playerAddress.toLowerCase();

                const voteData: VoteData = { guessedBot, signature, playerAddress };

                if (voter === player1) {
                    state.votes.p1 = voteData;
                    console.log(`✓ P1 vote stored for game ${gameId}`);

                    // PvE: server signs P2 vote on bot's behalf (always FALSE — bot says "human")
                    if (state.botSession) {
                        const botGuess = false; // bot pretends opponent is human
                        const messageHash = ethers.solidityPackedKeccak256(
                            ['uint256', 'bool', 'string'],
                            [BigInt(gameId), botGuess, 'VOTE'],
                        );
                        const botSig = await resolverWallet.signMessage(ethers.getBytes(messageHash));
                        state.votes.p2 = {
                            guessedBot: botGuess,
                            signature: botSig,
                            playerAddress: BOTINFT_ADDRESS,
                        };
                        console.log(`🤖 Server signed bot vote for game ${gameId}`);
                    }
                } else if (voter === player2) {
                    state.votes.p2 = voteData;
                    console.log(`✓ P2 vote stored for game ${gameId}`);
                } else {
                    socket.emit('voteError', { error: 'Not a player in this game' });
                    return;
                }

                socket.emit('voteReceived', { gameId, success: true });
                io.to(gameId.toString()).emit('voteReceived', { gameId, success: true });

                if (state.votes.p1 && state.votes.p2) {
                    console.log(`🔄 Both votes in for game ${gameId}, resolving…`);
                    const txHash = await queueResolution(gameId);
                    if (txHash) {
                        // Reveal: include bot info if PvE
                        let reveal: any = null;
                        if (state.botTokenId !== null) {
                            const slug = personaSlugForBot(state.botTokenId);
                            reveal = { wasPvE: true, botTokenId: state.botTokenId, personaSlug: slug };
                        } else {
                            reveal = { wasPvE: false };
                        }
                        io.to(gameId.toString()).emit('gameResolved', {
                            gameId,
                            txHash,
                            p1GuessedBot: state.votes.p1.guessedBot,
                            p2GuessedBot: state.votes.p2.guessedBot,
                            reveal,
                        });
                    } else {
                        io.to(gameId.toString()).emit('resolveError', { gameId, error: 'On-chain resolution failed' });
                    }

                    // Cleanup match state after a grace window so frontend can fetch
                    setTimeout(() => matches.delete(gameId), 60_000);
                }
            } catch (e) {
                console.error(`vote handler error:`, (e as Error).message);
                socket.emit('voteError', { error: (e as Error).message });
            }
        },
    );

    socket.on('disconnect', () => {
        console.log(`- socket ${socket.id}`);
    });
});

// ============ Boot ============

const PORT = Number(process.env.PORT ?? 3001);
httpServer.listen(PORT, () => {
    console.log(`🚀 0xHuman backend on :${PORT}`);
    console.log(`   Personas available: ${listAvailablePersonas().join(', ') || '(none — run mint script)'}`);
    console.log(`   Persona key set:    ${personaKey ? 'yes' : 'no — memory + encrypted prompts disabled'}`);
});
