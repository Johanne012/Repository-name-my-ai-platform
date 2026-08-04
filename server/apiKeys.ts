import { createHash, randomBytes } from "node:crypto";

/** Generate a secure API key. Returns raw key + prefix + hash for storage. */
export function generateSecureApiKey(): {
  rawKey: string;
  keyPrefix: string;
  keyHash: string;
} {
  const rawKey = `sk_${randomBytes(24).toString("hex")}`;
  const keyPrefix = rawKey.slice(0, 11); // sk_ + 8 hex chars
  const keyHash = hashApiKey(rawKey);
  return { rawKey, keyPrefix, keyHash };
}

export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}
