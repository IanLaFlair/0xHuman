/**
 * Decrypt any AES-256-GCM blob downloaded from 0G Storage.
 *
 * Usage:
 *   node scripts/0g-test/decrypt-blob.cjs <path-to-downloaded-file>
 *
 * Reads PERSONA_KEY from .env.local (or env var) and prints the JSON
 * plaintext. Works for both encrypted personas and bot memory blobs —
 * they share the same {iv, ciphertext, authTag, algo:'aes-256-gcm'} shape.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    let envConfig = fs.readFileSync(envPath, 'utf8');
    if (envConfig.charCodeAt(0) === 0xFEFF) envConfig = envConfig.slice(1);
    envConfig.split('\n').forEach((line) => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim().replace(/[^\w]/g, '');
            const value = parts.slice(1).join('=').trim();
            if (!process.env[key] && value) process.env[key] = value;
        }
    });
}

const filePath = process.argv[2];
if (!filePath) {
    console.error('Usage: node scripts/0g-test/decrypt-blob.cjs <path-to-blob.json>');
    process.exit(1);
}
if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
}

const PERSONA_KEY = process.env.PERSONA_KEY;
if (!PERSONA_KEY || PERSONA_KEY.length !== 64) {
    console.error('❌ PERSONA_KEY missing or wrong length in .env.local (need 64 hex chars)');
    process.exit(1);
}

const raw = fs.readFileSync(filePath, 'utf8').trim();
let blob;
try {
    blob = JSON.parse(raw);
} catch {
    console.error('❌ File is not valid JSON');
    process.exit(1);
}

if (!blob.iv || !blob.ciphertext || !blob.authTag || blob.algo !== 'aes-256-gcm') {
    console.error('❌ Not a valid AES-256-GCM blob (need iv, ciphertext, authTag, algo:aes-256-gcm)');
    console.error('  Got keys:', Object.keys(blob));
    process.exit(1);
}

console.log(`\n[Decrypt] Reading ${filePath}`);
console.log(`  iv:         ${blob.iv}  (${blob.iv.length / 2} bytes)`);
console.log(`  ciphertext: ${blob.ciphertext.length / 2} bytes`);
console.log(`  authTag:    ${blob.authTag}  (${blob.authTag.length / 2} bytes)`);
console.log(`  algo:       ${blob.algo}\n`);

try {
    const key = Buffer.from(PERSONA_KEY, 'hex');
    const iv = Buffer.from(blob.iv, 'hex');
    const ct = Buffer.from(blob.ciphertext, 'hex');
    const tag = Buffer.from(blob.authTag, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ct), decipher.final()]);
    const data = JSON.parse(plaintext.toString('utf8'));

    console.log('✓ Decryption succeeded — plaintext:\n');
    console.log(JSON.stringify(data, null, 2));
    console.log(`\n  Bytes plaintext: ${plaintext.length}`);
} catch (e) {
    console.error('❌ Decryption failed:', e.message);
    console.error('  Likely PERSONA_KEY mismatch or auth tag invalid.');
    process.exit(1);
}
