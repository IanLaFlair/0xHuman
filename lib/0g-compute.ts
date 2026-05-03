/**
 * 0G Compute wrapper — server-side only.
 *
 * Provides typed API on top of @0gfoundation/0g-compute-ts-sdk for
 * AI inference with TEE attestation verification.
 *
 * mockMode: when enabled (or when ledger isn't bootstrapped), returns
 * deterministic fake replies so the rest of the integration (storage,
 * contracts, UI, memory) can proceed without real Compute calls.
 */

import { createRequire } from 'node:module';
import { ethers, type Signer } from 'ethers';

const require = createRequire(import.meta.url);
const {
    createZGComputeNetworkBroker,
    createZGComputeNetworkReadOnlyBroker,
} = require('@0gfoundation/0g-compute-ts-sdk');

// ============ Config ============

export interface ComputeConfig {
    rpcUrl: string;
    /** Address of the inference provider (e.g. Qwen 2.5 7B Instruct provider on Galileo). */
    providerAddress: string;
    /** ethers.Signer for authenticated calls. Omit for read-only/listService. */
    signer?: Signer;
    /** When true, all infer() calls return deterministic fake replies. */
    mockMode?: boolean;
    /** Sampling temperature (default 0.85). */
    temperature?: number;
    /** Max output tokens (default 80 — keeps replies tight for chat UX). */
    maxTokens?: number;
}

export const DEFAULT_TESTNET_CONFIG = {
    rpcUrl: 'https://evmrpc-testnet.0g.ai',
    // Qwen 2.5 7B Instruct chatbot — confirmed on Galileo Day 2
    providerAddress: '0xa48f01287233509FD694a22Bf840225062E67836',
};

export const DEFAULT_MAINNET_CONFIG = {
    rpcUrl: 'https://evmrpc.0g.ai',
    // TODO: confirm mainnet provider once we deploy there
    providerAddress: '0x0000000000000000000000000000000000000000',
};

// ============ Types ============

export type ChatRole = 'system' | 'user' | 'assistant';
export interface ChatMessage {
    role: ChatRole;
    content: string;
}

export interface InferenceResult {
    /** Model's text reply. */
    reply: string;
    /** Provider-issued chat ID. Used to verify TEE attestation on-chain. */
    chatId: string | null;
    /** Whether the TEE signature has been verified via processResponse(). */
    verified: boolean;
    /** Latency for the inference call (excludes verification). */
    latencyMs: number;
    /** True when reply came from mock mode rather than real provider. */
    mocked: boolean;
}

export interface ProviderInfo {
    provider: string;
    model: string;
    serviceType: string;
    url: string;
    inputPrice?: bigint | string;
    outputPrice?: bigint | string;
}

// ============ List providers (free, read-only) ============

/**
 * Query the on-chain provider catalog. No wallet required.
 */
export async function listProviders(rpcUrl: string): Promise<ProviderInfo[]> {
    const broker = await createZGComputeNetworkReadOnlyBroker(rpcUrl);
    const services = await broker.inference.listService();
    return services.map((s: any) => ({
        provider: s.provider,
        model: s.model,
        serviceType: s.serviceType,
        url: s.url,
        inputPrice: s.inputPrice,
        outputPrice: s.outputPrice,
    }));
}

// ============ Authenticated inference ============

/**
 * Run a single inference call against the configured provider.
 *
 * If config.mockMode is true OR if the broker setup fails (e.g. ledger
 * not bootstrapped), this falls back to a deterministic mock reply so
 * downstream code can be exercised without real Compute capital.
 */
export async function infer(
    config: ComputeConfig,
    messages: ChatMessage[],
): Promise<InferenceResult> {
    if (config.mockMode) {
        return mockInfer(messages);
    }
    if (!config.signer) {
        throw new Error('infer() requires config.signer when mockMode is false');
    }

    let broker: any;
    try {
        broker = await createZGComputeNetworkBroker(config.signer);
    } catch (e) {
        return mockInferWithReason(messages, `broker init failed: ${(e as Error).message}`);
    }

    let endpoint: string;
    let model: string;
    try {
        const meta = await broker.inference.getServiceMetadata(config.providerAddress);
        endpoint = meta.endpoint;
        model = meta.model;
    } catch (e) {
        return mockInferWithReason(messages, `getServiceMetadata failed: ${(e as Error).message}`);
    }

    // Build the FINAL body first — getRequestHeaders signs the body, so the
    // bytes we sign must match the bytes we send byte-for-byte. Earlier we
    // signed messages-only and sent {messages, model, temperature, max_tokens},
    // which makes the provider reject with "endpoint not supported".
    const requestBody = JSON.stringify({
        messages,
        model,
        temperature: config.temperature ?? 0.85,
        max_tokens: config.maxTokens ?? 80,
    });

    let headers: Record<string, string>;
    try {
        headers = await broker.inference.getRequestHeaders(config.providerAddress, requestBody);
    } catch (e) {
        // Most common: ledger not bootstrapped (3 0G minimum)
        return mockInferWithReason(messages, `getRequestHeaders failed: ${(e as Error).message}`);
    }

    const t0 = Date.now();
    // Provider's `endpoint` already includes /v1/proxy, so just append the route
    const response = await fetch(`${endpoint}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: requestBody,
    });
    const latencyMs = Date.now() - t0;

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Inference HTTP ${response.status}: ${text}`);
    }

    const data: any = await response.json();
    const reply = data.choices?.[0]?.message?.content ?? '';
    const chatId =
        response.headers.get('zg-res-key') ??
        response.headers.get('ZG-Res-Key') ??
        null;

    let verified = false;
    if (chatId) {
        try {
            const ok = await broker.inference.processResponse(config.providerAddress, chatId);
            verified = ok === true;
        } catch (e) {
            // verification failure shouldn't break inference flow; log
            console.warn('[0g-compute] processResponse failed:', (e as Error).message);
        }
    }

    return { reply, chatId, verified, latencyMs, mocked: false };
}

// ============ Mock mode ============

const MOCK_REPLIES_BY_VIBE: Record<string, string[]> = {
    chill: ['lol fr', 'word', 'bet', 'no cap', 'haha valid'],
    sarcastic: ['oh wow groundbreaking', 'sure thing einstein', 'mind blown'],
    curious: ['wait what', 'tell me more', 'how come', 'interesting'],
    default: ['hmm', 'haha', 'idk man', 'fr', 'lol yeah'],
};

function pickVibe(systemPrompt: string): keyof typeof MOCK_REPLIES_BY_VIBE {
    const lower = systemPrompt.toLowerCase();
    if (lower.includes('chill') || lower.includes('gen-z')) return 'chill';
    if (lower.includes('sarcastic') || lower.includes('edgy')) return 'sarcastic';
    if (lower.includes('curious') || lower.includes('grandma')) return 'curious';
    return 'default';
}

/**
 * Deterministic-ish mock reply. Used when mockMode flag is set, or when
 * real broker calls fail (e.g. ledger not bootstrapped).
 */
function mockInfer(messages: ChatMessage[]): InferenceResult {
    const sys = messages.find((m) => m.role === 'system')?.content ?? '';
    const lastUser = messages.filter((m) => m.role === 'user').pop()?.content ?? '';
    const vibe = pickVibe(sys);
    const candidates = MOCK_REPLIES_BY_VIBE[vibe];
    // Pick deterministically from last-user message length
    const reply = candidates[lastUser.length % candidates.length];
    return {
        reply,
        chatId: `mock-${Date.now()}`,
        verified: false,
        latencyMs: 50,
        mocked: true,
    };
}

function mockInferWithReason(messages: ChatMessage[], reason: string): InferenceResult {
    console.warn('[0g-compute] Falling back to mock mode:', reason);
    return mockInfer(messages);
}

// ============ Helpers ============

export function configFromPrivateKey(
    privateKey: string,
    network: 'testnet' | 'mainnet' = 'testnet',
    overrides: Partial<ComputeConfig> = {},
): ComputeConfig {
    const preset = network === 'mainnet' ? DEFAULT_MAINNET_CONFIG : DEFAULT_TESTNET_CONFIG;
    const provider = new ethers.JsonRpcProvider(preset.rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);
    return { ...preset, signer, ...overrides };
}
