// Shared AES-GCM + PBKDF2 helpers.
//
// Used both at build time (Node, inside the `data.enc.json` endpoint, to encrypt
// recipe content) and at runtime in the browser (the unlock gate, to decrypt it).
// Both environments expose the standard Web Crypto API (`crypto.subtle`), so one
// implementation covers both — no duplicated crypto logic between build and client.

const SALT = new TextEncoder().encode("recipe-book-cookbook-gate-v1");
const PBKDF2_ITERATIONS = 300_000;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Derives an AES-256-GCM key from a password. Deterministic: the same password
 * always derives the same key, so build (encrypt) and client (decrypt) agree
 * without ever exchanging the key itself.
 */
export async function deriveKey(password: string): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: SALT, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    true, // extractable — lets the derived key be cached client-side (see exportKey)
    ["encrypt", "decrypt"],
  );
}

export interface EncryptedPayload {
  iv: string;
  ciphertext: string;
}

export async function encryptJSON(data: unknown, key: CryptoKey): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  return {
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  };
}

/** Throws if `payload` can't be authenticated with `key` — i.e. the wrong password. */
export async function decryptJSON<T>(payload: EncryptedPayload, key: CryptoKey): Promise<T> {
  const iv = base64ToBytes(payload.iv);
  const ciphertext = base64ToBytes(payload.ciphertext);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return JSON.parse(new TextDecoder().decode(plaintext));
}

/** Exports a derived key as a portable string, for caching in localStorage. */
export async function exportKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return bytesToBase64(new Uint8Array(raw));
}

/** Re-imports a key previously produced by exportKey(). */
export async function importKey(raw: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", base64ToBytes(raw), { name: "AES-GCM" }, true, [
    "encrypt",
    "decrypt",
  ]);
}
