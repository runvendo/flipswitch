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

export interface ExchangeResult {
  apiKey: string;
  baseUrl: string;
  userId: string;
  tenantId: string;
  balanceUsd: number;
}

/**
 * Exchange an auth code for a Vendo proxy API key.
 * The returned base_url points to the Vendo proxy that forwards to OpenRouter.
 */
async function exchangeCode(
  code: string,
  codeVerifier: string
): Promise<ExchangeResult> {
  const res = await fetch(`${VENDO_BASE_URL}/api/cli/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, code_verifier: codeVerifier }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as {
    api_key: string;
    base_url: string;
    user_id: string;
    tenant_id: string;
    balance_usd: number;
  };
  return {
    apiKey: data.api_key,
    baseUrl: data.base_url,
    userId: data.user_id,
    tenantId: data.tenant_id,
    balanceUsd: data.balance_usd ?? 0,
  };
}

/**
 * Find an available port for the callback server.
 */
function getRandomPort(): number {
  return 10000 + Math.floor(Math.random() * 50000);
}

/**
 * Perform the full Vendo login flow.
 * Opens browser, waits for callback, exchanges code for a Vendo proxy key.
 */
export async function performLogin(): Promise<ExchangeResult> {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = computeCodeChallenge(codeVerifier);
  const port = getRandomPort();
  const callbackUrl = `http://localhost:${port}/callback`;

  const { promise, server } = startCallbackServer(port, 120_000);

  const authUrl = new URL(`${VENDO_BASE_URL}/authorize`);
  authUrl.searchParams.set("app", "flipswitch");
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
export async function revokeKey(apiKey: string): Promise<void> {
  try {
    await fetch(`${VENDO_BASE_URL}/api/cli/revoke`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    });
  } catch {
    // Best effort — don't fail logout if Vendo is unreachable
  }
}
