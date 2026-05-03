/**
 * AI Brain — 0G Compute backed.
 *
 * Replaces the previous Gemini-based implementation. Each "session" is a
 * per-match instance with its own bot persona + memory + chat history.
 *
 * Backward compat: a default session is exposed via `generateReply(msg)` for
 * scripts that don't yet manage per-match sessions.
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import {
    infer,
    configFromPrivateKey,
    type ChatMessage,
    type ComputeConfig,
} from '../lib/0g-compute.ts';
import {
    type BotMemory,
    buildSystemPromptWithMemory,
    emptyMemory,
} from '../lib/bot-memory.ts';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const PERSONAS_DIR = path.resolve(process.cwd(), 'data/personas');

// ============ Persona loading ============

export interface Persona {
    name: string;
    tagline?: string;
    color?: string;
    avatar?: string;
    systemPrompt: string;
    voiceParameters?: {
        temperature?: number;
        maxTokens?: number;
    };
}

const personaCache = new Map<string, Persona>();

export function loadPersona(slug: string): Persona {
    if (personaCache.has(slug)) return personaCache.get(slug)!;
    const filePath = path.join(PERSONAS_DIR, `${slug}.json`);
    if (!fs.existsSync(filePath)) {
        throw new Error(`Persona not found: ${slug} (looked at ${filePath})`);
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    const persona = JSON.parse(raw) as Persona;
    personaCache.set(slug, persona);
    return persona;
}

export function listAvailablePersonas(): string[] {
    if (!fs.existsSync(PERSONAS_DIR)) return [];
    return fs
        .readdirSync(PERSONAS_DIR)
        .filter((f) => f.endsWith('.json'))
        .map((f) => f.replace('.json', ''));
}

// ============ Session ============

export interface BotSessionOptions {
    /** Slug of the persona JSON file (e.g. "mochi"). Required. */
    personaSlug: string;
    /** Bot memory. If omitted, uses emptyMemory(). */
    memory?: BotMemory;
    /** Lowercased opponent address — used for RAG context lookup. */
    opponent?: string;
    /** Override compute config (e.g. mockMode for offline dev). */
    computeConfig?: ComputeConfig;
}

export interface BotReply {
    text: string;
    chatId: string | null;
    verified: boolean;
    latencyMs: number;
    mocked: boolean;
}

export class BotSession {
    readonly persona: Persona;
    readonly memory: BotMemory;
    readonly opponent?: string;
    private history: ChatMessage[] = [];
    private computeConfig: ComputeConfig;

    constructor(opts: BotSessionOptions) {
        this.persona = loadPersona(opts.personaSlug);
        this.memory = opts.memory ?? emptyMemory(opts.personaSlug);
        this.opponent = opts.opponent;

        if (opts.computeConfig) {
            this.computeConfig = opts.computeConfig;
        } else {
            const pk = process.env.PRIVATE_KEY;
            if (!pk) {
                throw new Error('PRIVATE_KEY missing — set in .env.local or pass computeConfig');
            }
            // Default: try real testnet, fall back to mock if ledger isn't bootstrapped
            this.computeConfig = configFromPrivateKey(pk, 'testnet');
        }
    }

    /**
     * Build the system prompt: persona base + memory RAG block + game-specific
     * instructions. Memoised per-session, so subsequent turns reuse it.
     */
    private buildSystemPrompt(): string {
        const base = this.persona.systemPrompt;
        return buildSystemPromptWithMemory(base, this.memory, {
            currentOpponent: this.opponent,
            maxLessons: 5,
            maxSummaries: 3,
        });
    }

    /**
     * Generate a reply to the opponent's latest message.
     * Updates internal history so subsequent turns have context.
     */
    async reply(userMessage: string): Promise<BotReply> {
        const messages: ChatMessage[] = [
            { role: 'system', content: this.buildSystemPrompt() },
            ...this.history,
            { role: 'user', content: userMessage },
        ];

        const result = await infer(this.computeConfig, messages);

        // Update history with the user message and bot reply
        this.history.push({ role: 'user', content: userMessage });
        this.history.push({ role: 'assistant', content: result.reply });

        // Cap history to last N turns to keep prompt size bounded
        const MAX_HISTORY_TURNS = 16; // 8 user + 8 assistant
        if (this.history.length > MAX_HISTORY_TURNS) {
            this.history = this.history.slice(this.history.length - MAX_HISTORY_TURNS);
        }

        return {
            text: result.reply,
            chatId: result.chatId,
            verified: result.verified,
            latencyMs: result.latencyMs,
            mocked: result.mocked,
        };
    }

    /** Snapshot of the current chat history for transcript persistence. */
    getHistory(): ChatMessage[] {
        return this.history.slice();
    }
}

export function createBotSession(opts: BotSessionOptions): BotSession {
    return new BotSession(opts);
}

// ============ Backward-compat default session ============

let _defaultSession: BotSession | null = null;

function ensureDefault(): BotSession {
    if (!_defaultSession) {
        const slug = process.env.DEFAULT_PERSONA ?? 'mochi';
        _defaultSession = new BotSession({ personaSlug: slug });
    }
    return _defaultSession;
}

/**
 * Backward-compat shim used by older callers (e.g. existing bot-agent.ts).
 * Maintains a single global session under the persona named by
 * DEFAULT_PERSONA env var (defaults to 'mochi').
 */
export async function generateReply(userMessage: string): Promise<string> {
    const session = ensureDefault();
    const result = await session.reply(userMessage);
    return result.text;
}

// ============ CLI test ============

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop() ?? '')) {
    (async () => {
        const slug = process.env.DEFAULT_PERSONA ?? 'mochi';
        const session = createBotSession({ personaSlug: slug });
        console.log(`[ai-brain] Loaded persona: ${session.persona.name}`);
        console.log(`[ai-brain] Available personas: ${listAvailablePersonas().join(', ')}`);

        const { createInterface } = await import('node:readline');
        const rl = createInterface({ input: process.stdin, output: process.stdout });
        const ask = () => {
            rl.question('You: ', async (msg: string) => {
                const reply = await session.reply(msg);
                console.log(`${session.persona.name} ${reply.mocked ? '(mock)' : '(0G Compute)'}: ${reply.text}`);
                ask();
            });
        };
        ask();
    })();
}
