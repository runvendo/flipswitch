import { describe, it, expect } from "vitest";
import { generateCodeVerifier, computeCodeChallenge } from "../../src/lib/auth.js";

// base64url alphabet: A-Z, a-z, 0-9, -, _  (no +, /, or = padding)
const BASE64URL_RE = /^[A-Za-z0-9\-_]+$/;

describe("generateCodeVerifier", () => {
  it("returns a base64url string with no padding or unsafe characters", () => {
    const verifier = generateCodeVerifier();
    expect(BASE64URL_RE.test(verifier)).toBe(true);
  });

  it("returns a string of expected length for 32 random bytes", () => {
    // 32 bytes base64url-encoded without padding → ceil(32 * 4 / 3) = 43 chars
    const verifier = generateCodeVerifier();
    expect(verifier.length).toBe(43);
  });

  it("returns a unique value on each call", () => {
    const a = generateCodeVerifier();
    const b = generateCodeVerifier();
    expect(a).not.toBe(b);
  });
});

describe("computeCodeChallenge", () => {
  it("produces a deterministic SHA-256 hash for a given verifier", () => {
    const verifier = "test-verifier-value";
    const challenge1 = computeCodeChallenge(verifier);
    const challenge2 = computeCodeChallenge(verifier);
    expect(challenge1).toBe(challenge2);
  });

  it("returns a base64url string with no +, /, or = characters", () => {
    const challenge = computeCodeChallenge("any-verifier-string");
    expect(BASE64URL_RE.test(challenge)).toBe(true);
  });

  it("returns a string of expected length for a SHA-256 digest", () => {
    // SHA-256 produces 32 bytes → 43 base64url chars (no padding)
    const challenge = computeCodeChallenge("any-verifier-string");
    expect(challenge.length).toBe(43);
  });

  it("produces different output for different inputs", () => {
    const a = computeCodeChallenge("verifier-one");
    const b = computeCodeChallenge("verifier-two");
    expect(a).not.toBe(b);
  });

  it("matches a known SHA-256 base64url value", () => {
    // Independent verification: echo -n "abc" | openssl dgst -sha256 -binary | base64url
    // SHA-256("abc") = ba7816bf8f01cfea414140de5dae2ec73b00361bbef0469f492c6460d7d6f02
    // base64url of that digest = ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0
    const challenge = computeCodeChallenge("abc");
    expect(challenge).toBe("ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0");
  });
});
