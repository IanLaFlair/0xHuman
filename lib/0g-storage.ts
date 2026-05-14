/**
 * 0G Storage wrapper — server-side only.
 *
 * Provides typed, simplified API on top of @0gfoundation/0g-storage-ts-sdk
 * for chat transcript and encrypted bot prompt storage.
 *
 * NOTE: SDK ships an ESM build with a packaging bug. We import via
 * createRequire to force CommonJS resolution from the .ts file.
 */

import { createRequire } from 'node:module';
import { ethers, type Signer } from 'ethers';
import * as crypto from 'node:crypto';

const require = createRequire(import.meta.url);
const { Indexer, MemData } = require('@0gfoundation/0g-storage-ts-sdk');

// ============ Config ============

export interface StorageConfig {
    evmRpc: string;          // 0G EVM RPC URL
    indexerRpc: string;       // 0G Storage indexer URL
    signer: Signer;           // ethers.Signer for paying upload fees
}

export const DEFAULT_TESTNET_CONFIG = {
    evmRpc: 'https://evmrpc-testnet.0g.ai',
    indexerRpc: 'https://indexer-storage-testnet-turbo.0g.ai',
};

export const DEFAULT_MAINNET_CONFIG = {
    evmRpc: 'https://evmrpc.0g.ai',
    // 0G mainnet "Turbo" storage indexer — source: docs.0g.ai mainnet overview.
    // Standard network has a separate (slower, cheaper) indexer not used here.
    indexerRpc: 'https://indexer-storage-turbo.0g.ai',
};

// ============ Types ============

export interface UploadResult {
    rootHash: string;
    txHash: string;
    sizeBytes: number;
    latencyMs: number;
}

export interface DownloadResult<T = unknown> {
    data: T;
    sizeBytes: number;
    latencyMs: number;
}

// ============ Plain JSON ============

/**
 * Upload a JSON-serializable object to 0G Storage.
 * Use for non-sensitive data (chat transcripts, public bot stats).
 */
export async function uploadJSON(
    config: StorageConfig,
    data: unknown,
): Promise<UploadResult> {
    const json = JSON.stringify(data);
    const bytes = new TextEncoder().encode(json);
    return uploadBytes(config, bytes);
}

/**
 * Download a JSON blob by its root hash and parse it.
 */
export async function downloadJSON<T = unknown>(
    config: StorageConfig,
    rootHash: string,
): Promise<DownloadResult<T>> {
    const result = await downloadBytes(config, rootHash);
    const text = new TextDecoder().decode(result.bytes);
    return {
        data: JSON.parse(text) as T,
        sizeBytes: result.sizeBytes,
        latencyMs: result.latencyMs,
    };
}

// ============ Encrypted JSON (AES-256-GCM) ============

export interface EncryptedBlob {
    iv: string;          // hex
    ciphertext: string;  // hex
    authTag: string;     // hex
    algo: 'aes-256-gcm';
}

/**
 * Encrypt JSON with AES-256-GCM, then upload to 0G Storage.
 *
 * The symmetric key is provided by the caller — typically derived from
 * an INFT owner's seed or shared with the TEE provider for inference.
 *
 * Returns the storage root hash. The encrypted blob structure is stored
 * as JSON inside; clients need both the rootHash and the symmetric key
 * to decrypt.
 */
export async function uploadEncrypted(
    config: StorageConfig,
    data: unknown,
    symmetricKey: Buffer,
): Promise<UploadResult> {
    if (symmetricKey.length !== 32) {
        throw new Error(`Expected 32-byte AES-256 key, got ${symmetricKey.length}`);
    }

    const plaintext = Buffer.from(JSON.stringify(data), 'utf8');
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', symmetricKey, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const blob: EncryptedBlob = {
        iv: iv.toString('hex'),
        ciphertext: ciphertext.toString('hex'),
        authTag: authTag.toString('hex'),
        algo: 'aes-256-gcm',
    };

    return uploadJSON(config, blob);
}

/**
 * Download and decrypt an AES-256-GCM blob from 0G Storage.
 */
export async function downloadEncrypted<T = unknown>(
    config: StorageConfig,
    rootHash: string,
    symmetricKey: Buffer,
): Promise<DownloadResult<T>> {
    const { data: blob, sizeBytes, latencyMs } = await downloadJSON<EncryptedBlob>(
        config,
        rootHash,
    );

    if (blob.algo !== 'aes-256-gcm') {
        throw new Error(`Unsupported algorithm: ${blob.algo}`);
    }

    const iv = Buffer.from(blob.iv, 'hex');
    const ciphertext = Buffer.from(blob.ciphertext, 'hex');
    const authTag = Buffer.from(blob.authTag, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', symmetricKey, iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

    return {
        data: JSON.parse(plaintext.toString('utf8')) as T,
        sizeBytes,
        latencyMs,
    };
}

// ============ Internal: raw bytes ============

interface RawDownloadResult {
    bytes: Uint8Array;
    sizeBytes: number;
    latencyMs: number;
}

async function uploadBytes(
    config: StorageConfig,
    bytes: Uint8Array,
): Promise<UploadResult> {
    const memData = new MemData(bytes);
    const indexer = new Indexer(config.indexerRpc);

    const t0 = Date.now();
    const [result, err] = await indexer.upload(memData, config.evmRpc, config.signer);
    const latencyMs = Date.now() - t0;

    if (err) {
        throw new Error(`0G Storage upload failed: ${(err as Error).message ?? String(err)}`);
    }

    const rootHash = result.rootHash ?? result.rootHashes?.[0];
    const txHash = result.txHash ?? result.txHashes?.[0];

    if (!rootHash || !txHash) {
        throw new Error(`Upload succeeded but result missing rootHash/txHash: ${JSON.stringify(result)}`);
    }

    return { rootHash, txHash, sizeBytes: bytes.length, latencyMs };
}

async function downloadBytes(
    config: StorageConfig,
    rootHash: string,
): Promise<RawDownloadResult> {
    const indexer = new Indexer(config.indexerRpc);

    const t0 = Date.now();
    const [blob, err] = await indexer.downloadToBlob(rootHash, { proof: true });
    const latencyMs = Date.now() - t0;

    if (err) {
        throw new Error(`0G Storage download failed: ${(err as Error).message ?? String(err)}`);
    }

    const buf = await (blob as Blob).arrayBuffer();
    const bytes = new Uint8Array(buf);

    return { bytes, sizeBytes: bytes.length, latencyMs };
}

// ============ Helpers ============

/**
 * Generate a fresh 32-byte AES-256 key. Caller is responsible for
 * persisting it securely (typically: encrypt with owner's pubkey,
 * include in INFT metadata).
 */
export function generateSymmetricKey(): Buffer {
    return crypto.randomBytes(32);
}

/**
 * Build a StorageConfig from a private key + network preset.
 * Convenience for backend scripts.
 */
export function configFromPrivateKey(
    privateKey: string,
    network: 'testnet' | 'mainnet' = 'testnet',
): StorageConfig {
    const preset = network === 'mainnet' ? DEFAULT_MAINNET_CONFIG : DEFAULT_TESTNET_CONFIG;
    const provider = new ethers.JsonRpcProvider(preset.evmRpc);
    const signer = new ethers.Wallet(privateKey, provider);
    return { ...preset, signer };
}
