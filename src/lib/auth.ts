import { createServer, type Server } from "node:http";
import { randomBytes, createHash } from "node:crypto";
import open from "open";
import { VENDO_BASE_URL } from "../types.js";

function base64url(buffer: Buffer): string {
  return buffer.toString("base64url");
}

export function generateCodeVerifier(): string {
  return base64url(randomBytes(32));
}

export function computeCodeChallenge(verifier: string): string {
  return base64url(createHash("sha256").update(verifier).digest());
}

interface CallbackResult {
  code: string;
}

/**
 * Start a temporary HTTP server to receive the OAuth callback.
 * Returns a promise that resolves with the auth code.
 */
function startCallbackServer(
  port: number,
  timeoutMs: number
): { promise: Promise<CallbackResult>; server: Server } {
  let resolve: (val: CallbackResult) => void;
  let reject: (err: Error) => void;

  const promise = new Promise<CallbackResult>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${port}`);

    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");

      if (error) {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(
          "<html><body><h2>Authentication failed</h2><p>You can close this tab.</p></body></html>"
        );
        reject!(new Error(`Auth failed: ${error}`));
        return;
      }

      if (code) {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(
          "<html><body><h2>Authentication successful!</h2><p>You can close this tab and return to your terminal.</p></body></html>"
        );
        resolve!({ code });
        return;
      }
    }

    res.writeHead(404);
    res.end();
  });

  server.listen(port, "127.0.0.1");

  const timeout = setTimeout(() => {
    reject!(new Error("Authentication timed out (120s). Try again."));
    server.close();
  }, timeoutMs);

  promise.finally(() => {
    clearTimeout(timeout);
    server.close();
  });

  return { promise, server };
}

/**
 * Exchange an auth code for an OpenRouter API key provisioned by Vendo.
 * Vendo creates a management key with a credit limit on their OR account.
 */
async function exchangeCode(
  code: string,
  codeVerifier: string
): Promise<{ apiKey: string; userId: string }> {
  const res = await fetch(`${VENDO_BASE_URL}/api/auth/flipswitch/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, code_verifier: codeVerifier }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { api_key: string; user_id: string };
  return { apiKey: data.api_key, userId: data.user_id };
}

/**
 * Find an available port for the callback server.
 */
function getRandomPort(): number {
  return 10000 + Math.floor(Math.random() * 50000);
}

/**
 * Perform the full Vendo login flow.
 * Opens browser, waits for callback, exchanges code for an OpenRouter API key.
 */
export async function performLogin(): Promise<{
  apiKey: string;
  userId: string;
}> {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = computeCodeChallenge(codeVerifier);
  const port = getRandomPort();
  const callbackUrl = `http://localhost:${port}/callback`;

  const { promise, server } = startCallbackServer(port, 120_000);

  const authUrl = new URL(`${VENDO_BASE_URL}/auth/flipswitch`);
  authUrl.searchParams.set("callback_url", callbackUrl);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  await open(authUrl.toString());

  const { code } = await promise;
  return exchangeCode(code, codeVerifier);
}

/**
 * Revoke the user's API key on Vendo (which revokes the OpenRouter management key).
 */
export async function revokeKey(vendoUserId: string): Promise<void> {
  try {
    await fetch(`${VENDO_BASE_URL}/api/auth/flipswitch/revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: vendoUserId }),
    });
  } catch {
    // Best effort — don't fail logout if Vendo is unreachable
  }
}
