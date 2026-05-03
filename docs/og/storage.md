# 0G Storage

0xHuman stores three kinds of data on 0G Storage. Two are encrypted, one is public — by design.

---

## What lives where

| Data | Encrypted? | Why |
| :--- | :--- | :--- |
| Bot persona prompt | ✅ AES-256-GCM | Owner controls the AI's "intelligence". Without the key, ciphertext is hex garbage. |
| Bot memory (stats + lessons) | ✅ AES-256-GCM | Same: only authorized parties (server resolver) can decrypt. |
| Match chat transcripts | ❌ Plain JSON | Public audit trail for dispute resolution and replay. |

---

## Persona blob

Uploaded on mint via `POST /api/personas/upload` (template) or `/api/personas/upload-custom` (user-authored). Server encrypts with the protocol's symmetric key, uploads to 0G Storage, returns:

```ts
{
  uri: "og-storage://0x87c53c3e...",  // root hash pointer
  hash: "0x99164362...",              // keccak256 of plaintext (commitment)
}
```

The hash is committed on-chain via `BotINFT.mintFreeSlot(uri, hash)` so anyone can later verify the encrypted blob hasn't been swapped.

---

## Memory blob

Updated post-match. Server:

1. Loads current memory from 0G Storage (decrypts).
2. Appends new match outcome + extracted lesson via `appendMatch()`.
3. Re-encrypts.
4. Uploads new blob to 0G Storage → fresh `rootHash`.
5. Calls `BotINFT.updateMemory(tokenId, uri, hash)` — only the resolver address can do this, so memory can't be tampered with by anyone but the protocol.

---

## Chat transcript

After resolution, the server uploads the full transcript:

```json
{
  "gameId": 1,
  "transcript": [
    { "ts": 1715000001, "sender": "p1", "text": "hi" },
    { "ts": 1715000005, "sender": "p2", "text": "hey there :3" },
    ...
  ],
  "anchoredAt": 1715000060
}
```

Public, retrievable by any URI holder. The hash is anchored on `OxHuman.anchorChatLog(gameId, hash, uri)` so disputes can verify the transcript matches what was committed at resolution time.

---

## Verifying empirically

Anyone can:
1. Visit `storagescan-galileo.0g.ai/history` to see all uploads from a wallet
2. Download any blob (raw bytes / JSON)
3. For encrypted blobs: paste into the `decrypt-blob.cjs` script with the persona key — get plaintext
4. For transcripts: read directly, hash and compare against `OxHuman.games(id).chatLogHash`

This is the canonical proof that 0G Storage is doing real work — not just "stored on a server somewhere".
