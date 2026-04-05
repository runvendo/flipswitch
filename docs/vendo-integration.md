# Flipswitch Integration Spec for Vendo

> **What is this?** This document is a complete implementation brief for the Vendo backend (https://vendo.run) to support [Flipswitch](https://github.com/vendo-dev/flipswitch) — a CLI tool that lets users route Claude Code through OpenRouter.
>
> **What does Vendo need to do?** Expose two API endpoints and a database table so that `flipswitch login` can authenticate users via Vendo's existing Supabase auth and provision them an OpenRouter API key billed to Vendo's account.

---

## How Flipswitch Works (Context)

Flipswitch is a CLI tool (`npm install -g flipswitch`) that configures Claude Code to route API calls through OpenRouter instead of directly to Anthropic. It does this by writing environment variables to `~/.claude/settings.json`:

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://openrouter.ai/api",
    "ANTHROPIC_AUTH_TOKEN": "sk-or-v1-...",
    "ANTHROPIC_API_KEY": ""
  }
}
```

Users have two auth modes:
1. **Direct key** (`flipswitch key <key>`) — user provides their own OpenRouter key
2. **Vendo login** (`flipswitch login`) — user authenticates via Vendo, gets a managed key billed to Vendo's OpenRouter account

This document covers option 2 — the Vendo-managed flow.

---

## Architecture Overview

```
User                    Flipswitch CLI             Vendo Backend            OpenRouter
 |                           |                          |                       |
 |  flipswitch login         |                          |                       |
 |-------------------------->|                          |                       |
 |                           | 1. Generate PKCE pair    |                       |
 |                           | 2. Start localhost:PORT  |                       |
 |                           | 3. Open browser -------->|                       |
 |                           |                          |                       |
 |  (browser) Log in via     |                          |                       |
 |  Supabase auth            |                          |                       |
 |-------------------------->|                          |                       |
 |                           |                          | 4. Auth success       |
 |                           |                          | 5. Generate auth code |
 |                           |   6. Redirect to         |                       |
 |                           |      localhost/callback   |                       |
 |                           |<-------------------------|                       |
 |                           |                          |                       |
 |                           | 7. POST /exchange        |                       |
 |                           |------------------------->|                       |
 |                           |                          | 8. Validate PKCE      |
 |                           |                          | 9. Create OR key ---->|
 |                           |                          |<---- { key: sk-or }   |
 |                           |<-- { api_key, user_id }  |                       |
 |                           |                          |                       |
 |  "Login successful!"      |                          |                       |
 |<--------------------------|                          |                       |
```

---

## Prerequisites (One-Time Setup)

### 1. Create an OpenRouter Management API Key

1. Go to https://openrouter.ai/settings/keys
2. Create a new **Management API key** (this is a special key type that can only create/list/delete other keys — it cannot make model completions)
3. Store it securely in your Supabase environment as `OPENROUTER_MANAGEMENT_KEY`

This key is used server-side only. It never leaves the Vendo backend.

### 2. Fund the OpenRouter Account

The managed keys that Vendo provisions will bill to Vendo's OpenRouter account. Ensure the account has credits or a payment method on file at https://openrouter.ai/settings/credits.

---

## Database Schema

### Table: `flipswitch_keys`

Tracks the OpenRouter API keys provisioned for each user.

```sql
create table public.flipswitch_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  openrouter_key_hash text not null,
  openrouter_key_name text not null,
  spending_limit numeric default 50,
  limit_reset text default 'monthly',
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint flipswitch_keys_user_id_unique unique (user_id)
);

-- RLS: only the service role can read/write this table
alter table public.flipswitch_keys enable row level security;

-- Index for lookup by user
create index idx_flipswitch_keys_user_id on public.flipswitch_keys(user_id);
```

### Table: `flipswitch_auth_codes`

Temporary auth codes for the PKCE exchange (60-second TTL).

```sql
create table public.flipswitch_auth_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null unique,
  code_challenge text not null,
  callback_url text not null,
  created_at timestamptz not null default now(),
  used_at timestamptz
);

-- Auto-expire old codes (run via pg_cron or Supabase Edge Function cron)
-- delete from public.flipswitch_auth_codes where created_at < now() - interval '5 minutes';
```

---

## Endpoints to Build

### Endpoint 1: Auth Page

**`GET /auth/flipswitch`**

This is a web page (not an API endpoint) that the CLI opens in the user's browser.

**Query parameters:**
| Param | Required | Description |
|---|---|---|
| `callback_url` | Yes | The localhost URL to redirect to after auth (e.g., `http://localhost:43210/callback`) |
| `code_challenge` | Yes | Base64url-encoded SHA-256 hash of the PKCE code verifier |
| `code_challenge_method` | Yes | Always `S256` |

**Flow:**
1. If the user is **not logged in** → show your existing Supabase login UI (email/password, OAuth, magic link, etc.)
2. If the user **is logged in** (has a Supabase session) → proceed immediately
3. Generate a random auth code (e.g., 32 random bytes, hex-encoded)
4. Store in `flipswitch_auth_codes`:
   ```sql
   insert into flipswitch_auth_codes (user_id, code, code_challenge, callback_url)
   values ($user_id, $code, $code_challenge, $callback_url);
   ```
5. Redirect to: `{callback_url}?code={code}`

**Implementation options:**
- **Next.js page** at `app/auth/flipswitch/page.tsx` that checks session, shows login if needed, generates code, redirects
- **Supabase Edge Function** if you prefer serverless

**Example redirect:**
```
http://localhost:43210/callback?code=a1b2c3d4e5f6...
```

---

### Endpoint 2: Token Exchange

**`POST /api/auth/flipswitch/exchange`**

Called by the CLI after receiving the auth code. Returns a managed OpenRouter API key.

**Request:**
```json
{
  "code": "a1b2c3d4e5f6...",
  "code_verifier": "random-43-char-string"
}
```

**Response (200):**
```json
{
  "api_key": "sk-or-v1-abc123...",
  "user_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Error responses:**
- `400` — Missing code or code_verifier
- `401` — Invalid or expired auth code
- `401` — PKCE validation failed
- `500` — OpenRouter API error

**Implementation:**

```typescript
// Pseudocode for the exchange endpoint

export async function POST(req: Request) {
  const { code, code_verifier } = await req.json();

  // 1. Look up the auth code
  const authCode = await db.flipswitch_auth_codes.findOne({
    code,
    used_at: null,
    created_at: { gt: new Date(Date.now() - 60_000) }, // 60s TTL
  });

  if (!authCode) {
    return Response.json({ error: "Invalid or expired code" }, { status: 401 });
  }

  // 2. Validate PKCE
  const expectedChallenge = base64url(sha256(code_verifier));
  if (expectedChallenge !== authCode.code_challenge) {
    return Response.json({ error: "PKCE validation failed" }, { status: 401 });
  }

  // 3. Mark code as used
  await db.flipswitch_auth_codes.update(authCode.id, { used_at: new Date() });

  // 4. Check if user already has an active key
  const existingKey = await db.flipswitch_keys.findOne({
    user_id: authCode.user_id,
    revoked_at: null,
  });

  // 5. If existing key, revoke it on OpenRouter
  if (existingKey) {
    await fetch(`https://openrouter.ai/api/v1/keys/${existingKey.openrouter_key_hash}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${OPENROUTER_MANAGEMENT_KEY}` },
    });
    await db.flipswitch_keys.update(existingKey.id, { revoked_at: new Date() });
  }

  // 6. Create a new OpenRouter API key via Provisioning API
  const orResponse = await fetch("https://openrouter.ai/api/v1/keys", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_MANAGEMENT_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: `flipswitch-${authCode.user_id}`,
      limit: 50,             // $50 spending limit
      limit_reset: "monthly", // resets monthly at midnight UTC
    }),
  });

  if (!orResponse.ok) {
    return Response.json({ error: "Failed to create API key" }, { status: 500 });
  }

  const orData = await orResponse.json();
  // orData.key = "sk-or-v1-..." (only shown once!)
  // orData.data.hash = "..." (for future management)

  // 7. Store the key hash (NOT the key itself — it's only shown once)
  await db.flipswitch_keys.create({
    user_id: authCode.user_id,
    openrouter_key_hash: orData.data.hash,
    openrouter_key_name: `flipswitch-${authCode.user_id}`,
    spending_limit: 50,
    limit_reset: "monthly",
  });

  // 8. Return the key to the CLI
  return Response.json({
    api_key: orData.key,
    user_id: authCode.user_id,
  });
}
```

---

### Endpoint 3: Key Revocation

**`POST /api/auth/flipswitch/revoke`**

Called by `flipswitch logout`. Revokes the user's managed OpenRouter key.

**Request:**
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (200):**
```json
{ "ok": true }
```

**Implementation:**
1. Look up the user's active key in `flipswitch_keys`
2. Call `DELETE https://openrouter.ai/api/v1/keys/{hash}` with the management key
3. Set `revoked_at = now()` in the database
4. Return success (idempotent — return 200 even if no key found)

**Security note:** This endpoint should be authenticated. Either:
- Require the Supabase session token in the `Authorization` header, OR
- Validate the `user_id` against a signed token

---

## Environment Variables Needed

Add these to your Vendo deployment environment:

| Variable | Description |
|---|---|
| `OPENROUTER_MANAGEMENT_KEY` | Management API key from OpenRouter (for creating/revoking user keys) |
| `FLIPSWITCH_SPENDING_LIMIT` | Default per-user spending limit in USD (default: 50) |
| `FLIPSWITCH_LIMIT_RESET` | Reset frequency: `daily`, `weekly`, `monthly` (default: `monthly`) |

---

## PKCE Reference

Flipswitch uses PKCE (Proof Key for Code Exchange) to secure the auth flow. Here's how to validate it:

```typescript
import { createHash } from "node:crypto";

function base64url(buffer: Buffer): string {
  return buffer.toString("base64url");
}

function validatePKCE(codeVerifier: string, codeChallenge: string): boolean {
  const expected = base64url(
    createHash("sha256").update(codeVerifier).digest()
  );
  return expected === codeChallenge;
}
```

The CLI generates a random `code_verifier`, computes `code_challenge = base64url(SHA256(code_verifier))`, and sends only the challenge to the auth page. During exchange, the CLI sends the verifier, and the server recomputes the challenge to verify it matches.

---

## Testing Checklist

1. **Auth page loads** — Visit `/auth/flipswitch?callback_url=http://localhost:9999/callback&code_challenge=test&code_challenge_method=S256`
   - Shows login if not authenticated
   - Redirects to callback_url with code if authenticated
2. **Token exchange works** — POST to `/api/auth/flipswitch/exchange` with valid code and verifier
   - Returns an OpenRouter API key
   - Key works for completions (test with `curl https://openrouter.ai/api/v1/auth/key -H "Authorization: Bearer sk-or-..."`)
3. **Duplicate login** — Running `flipswitch login` again revokes the old key and provisions a new one
4. **Key revocation** — POST to `/api/auth/flipswitch/revoke` deletes the key on OpenRouter
5. **Spending limit** — Provisioned key has the configured limit (check OpenRouter dashboard)
6. **Expired code** — Auth codes older than 60 seconds are rejected

---

## Optional Enhancements

- **Usage dashboard** — Fetch usage stats per key via `GET https://openrouter.ai/api/v1/keys` and surface in Vendo's UI
- **Custom limits** — Let users upgrade their spending limit through Vendo (paid tier)
- **Key rotation** — Automatically rotate keys on a schedule using a cron job
- **Webhooks** — OpenRouter may support webhooks for budget alerts; integrate with Vendo notifications
