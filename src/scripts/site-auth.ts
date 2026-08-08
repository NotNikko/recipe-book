// Client-side password gate. Unlike the old gate, the password never ships to the
// browser in any form — "correct password" means "AES-GCM decryption of data.enc.json
// succeeded." See src/lib/site-crypto.ts for the shared crypto and
// src/pages/data.enc.json.ts for how the bundle is produced at build time.

import { deriveKey, decryptJSON, exportKey, importKey, type EncryptedPayload } from "../lib/site-crypto";

export interface Recipe {
  id: string;
  title: string;
  description: string;
  image: string;
  category: string;
  tags: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: "Easy" | "Medium" | "Hard";
  featured: boolean;
  ingredients: string[];
  instructions: string[];
  body: string;
}

export interface CookbookData {
  recipes: Recipe[];
}

const KEY_STORAGE = "cookbook-site-key";

function base(): string {
  return import.meta.env.BASE_URL.replace(/\/?$/, "/");
}

async function fetchBundle(): Promise<EncryptedPayload> {
  const res = await fetch(`${base()}data.enc.json`);
  return res.json();
}

// A promise every page can `await` for the decrypted data. It only resolves once
// unlock succeeds (via a cached key or a freshly entered password) — pages that
// import this module and await getData() naturally wait for the gate.
let resolveData!: (data: CookbookData) => void;
let settled = false;
const dataPromise = new Promise<CookbookData>(resolve => {
  resolveData = resolve;
});

export function getData(): Promise<CookbookData> {
  return dataPromise;
}

function provide(data: CookbookData) {
  if (settled) return;
  settled = true;
  resolveData(data);
}

/** Tries to unlock using a previously cached key. Resolves true on success. */
export async function tryCachedUnlock(): Promise<boolean> {
  const raw = localStorage.getItem(KEY_STORAGE);
  if (!raw) return false;
  try {
    const key = await importKey(raw);
    const data = await decryptJSON<CookbookData>(await fetchBundle(), key);
    provide(data);
    return true;
  } catch {
    // Stale/invalid key (e.g. the site password was rotated) — fall back to the gate.
    localStorage.removeItem(KEY_STORAGE);
    return false;
  }
}

/**
 * Attempts to unlock with `password`. Caches the derived key on success so future
 * page loads skip the prompt (mirrors the old gate's "stay unlocked" behavior).
 * Resolves true on success, false on a wrong password.
 */
export async function unlock(password: string): Promise<boolean> {
  try {
    const key = await deriveKey(password);
    const data = await decryptJSON<CookbookData>(await fetchBundle(), key);
    localStorage.setItem(KEY_STORAGE, await exportKey(key));
    provide(data);
    return true;
  } catch {
    return false;
  }
}
