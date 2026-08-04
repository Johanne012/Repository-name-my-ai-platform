import { describe, it, expect } from "vitest";
import { generateSecureApiKey, hashApiKey } from "./apiKeys";

describe("apiKeys crypto", () => {
  it("generates sk_ prefix and 48 hex chars after prefix", () => {
    const { rawKey, keyPrefix, keyHash } = generateSecureApiKey();
    expect(rawKey.startsWith("sk_")).toBe(true);
    expect(rawKey.length).toBe(3 + 48); // sk_ + 24 bytes hex
    expect(keyPrefix).toBe(rawKey.slice(0, 11));
    expect(keyHash).toHaveLength(64); // sha256 hex
  });

  it("hash is deterministic", () => {
    const a = hashApiKey("sk_test");
    const b = hashApiKey("sk_test");
    expect(a).toBe(b);
  });

  it("different keys produce different hashes", () => {
    const { rawKey: k1 } = generateSecureApiKey();
    const { rawKey: k2 } = generateSecureApiKey();
    expect(hashApiKey(k1)).not.toBe(hashApiKey(k2));
  });

  it("raw key is not equal to hash", () => {
    const { rawKey, keyHash } = generateSecureApiKey();
    expect(rawKey).not.toBe(keyHash);
  });
});
