# Flipswitch Integration Spec for Vendo

> **What is this?** A complete implementation brief for the Vendo backend (https://vendo.run) to support [Flipswitch](https://github.com/vendodev/flipswitch) — a CLI that lets users route Claude Code through OpenRouter.
>
> **What does Vendo need to build?**
> 1. **Auth endpoints** so `flipswitch login` can authenticate users and provision an OpenRouter API key
> 2. **OpenRouter management key provisioning** — Vendo creates per-user keys on its own OpenRouter account with credit limits
> 3. **Credit / billing system** — users buy credits on Vendo, Vendo sets OpenRouter key limits accordingly

---

## Architecture

```
Claude Code  -->  openrouter.ai/api  -->  Model Provider
                       |
                  Uses an OpenRouter API key
                  provisioned by Vendo (on Vendo's account)
                  with a credit limit matching
                  the user's Vendo balance
```

**Key points:**
- Users get a real OpenRouter API key — but it lives on **Vendo's** OpenRouter account
- `ANTHROPIC_BASE_URL` = `https://openrouter.ai/api` (same for all users)
- `ANTHROPIC_AUTH_TOKEN` = an OpenRouter key provisioned by Vendo
- **No proxy server needed** — requests go directly from Claude Code to OpenRouter
- Vendo controls the key's credit limit → user can't spend more than they've paid for
- Users who bring their own OpenRouter key (`flipswitch key`) bypass Vendo entirely
- If a user logs in on multiple machines, Vendo returns the **same key** (one key per user)

---

## Sequence Diagram

```
User                   Flipswitch CLI            Vendo Backend           OpenRouter
 |                          |                         |                      |
 |  flipswitch login        |                         |                      |
 |------------------------->|                         |                      |
 |                          | 1. Generate PKCE pair   |                      |
 |                          | 2. Start localhost:PORT |                      |
 |                          | 3. Open browser ------->|                      |
 |                          |                         |                      |
 |  (browser) Log in via    |                         |                      |
 |  Supabase auth           |                         |                      |
 |------------------------->|                         |                      |
 |                          |                         | 4. Auth success      |
 |                          |                         | 5. Generate auth code|
 |                          |   6. Redirect to        |                      |
 |                          |      localhost/callback  |                      |
 |                          |<------------------------|                      |
 |                          |                         |                      |
 |                          | 7. POST /exchange       |                      |
 |                          |------------------------>|                      |
 |                          |                         | 8. Validate PKCE     |
 |                          |                         | 9. Check if user     |
 |                          |                         |    already has a key |
 |                          |                         | 10. If not, create   |
 |                          |                         |     OR mgmt key ---->|
 |                          |                         |<-- key created       |
 |                          |<-- { api_key, user_id } |                      |
 |                          |                         |                      |
 |  "Logged in via Vendo."  |                         |                      |
 |<-------------------------|                         |                      |
 |                          |                         |                      |
 |  flipswitch on           |                         |                      |
 |------------------------->|                         |                      |
 |                          | Writes to settings.json:|                      |
 |                          | ANTHROPIC_BASE_URL =    |                      |
 |                          |   openrouter.ai/api     |                      |
 |                          | ANTHROPIC_AUTH_TOKEN =  |                      |
 |                          |   sk-or-v1-...          |                      |
 |                          |                         |                      |
 |  (Claude Code session)   |                         |                      |
 |  POST /v1/messages  -----|----(direct)-------------|--------------------->|
 |  <--- response ----------|----(direct)-------------|<--------------------|
 |                          |                         |                      |
 |                          |                         | (Vendo queries OR    |
 |                          |                         |  usage API on cron   |
 |                          |                         |  to track spend)     |
```

---

## Prerequisites (One-Time Setup)

### 1. Create an OpenRouter Account for Vendo

1. Go to https://openrouter.ai
2. Create an account for Vendo (this is Vendo's billing account)
3. Add a payment method at https://openrouter.ai/settings/credits
4. Generate a **management API key** at https://openrouter.ai/settings/keys — this key is used to provision per-user keys

### 2. Store the Management Key

Store as `OPENROUTER_MANAGEMENT_KEY` in your environment. This key never leaves the Vendo server.

---

## What to Build

### 1. Key Provisioning Service

When a user completes `flipswitch login`, Vendo provisions an OpenRouter API key on Vendo's account.

**Logic:**
1. Check if the user already has a key in `flipswitch_keys` table
2. If yes → return the existing key (one key per user, works across devices)
3. If no → create a new key via OpenRouter's management API

**Creating a key via OpenRouter:**

```typescript
// POST https://openrouter.ai/api/v1/keys
const res = await fetch("https://openrouter.ai/api/v1/keys", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${OPENROUTER_MANAGEMENT_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name: `flipswitch-${userId}`,
    label: `Flipswitch user ${userEmail}`,
    limit: userCreditBalance,  // USD — OpenRouter enforces this
  }),
});

const { key, data } = await res.json();
// key = "sk-or-v1-..." (the actual API key)
// data.id = key ID (for updating limit / revoking later)
```

**Updating the credit limit** (when user buys more credits):

```typescript
// PATCH https://openrouter.ai/api/v1/keys/{keyId}
await fetch(`https://openrouter.ai/api/v1/keys/${keyId}`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${OPENROUTER_MANAGEMENT_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    limit: newCreditBalance,
  }),
});
```

**Revoking a key** (on logout or account suspension):

```typescript
// DELETE https://openrouter.ai/api/v1/keys/{keyId}
await fetch(`https://openrouter.ai/api/v1/keys/${keyId}`, {
  method: "DELETE",
  headers: {
    Authorization: `Bearer ${OPENROUTER_MANAGEMENT_KEY}`,
  },
});
```

### 2. Auth Endpoints

#### Auth Page: `GET /auth/flipswitch`

A web page the CLI opens in the user's browser.

**Query parameters:**
| Param | Required | Description |
|---|---|---|
| `callback_url` | Yes | Localhost URL to redirect to (e.g., `http://localhost:43210/callback`) |
| `code_challenge` | Yes | Base64url-encoded SHA-256 hash of the PKCE code verifier |
| `code_challenge_method` | Yes | Always `S256` |

**Flow:**
1. If not logged in → show Supabase login UI
2. If logged in → generate a random auth code (32 bytes, hex)
3. Store in `flipswitch_auth_codes` table
4. Redirect to: `{callback_url}?code={code}`

#### Token Exchange: `POST /api/auth/flipswitch/exchange`

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

**Implementation:**
1. Look up auth code (60s TTL, not yet used)
2. Validate PKCE: `base64url(SHA256(code_verifier)) === code_challenge`
3. Mark code as used
4. Check `flipswitch_keys` — if user already has a key, return it
5. If not, provision a new OpenRouter management key with `limit = user's credit balance`
6. Store in `flipswitch_keys` table
7. Return the OpenRouter API key and user ID

#### Key Revocation: `POST /api/auth/flipswitch/revoke`

Called by `flipswitch logout`.

**Request:**
```json
{ "user_id": "550e8400-e29b-41d4-a716-446655440000" }
```

**Implementation:**
1. Look up the user's key in `flipswitch_keys`
2. Revoke (DELETE) the key on OpenRouter via management API
3. Mark as revoked in `flipswitch_keys`

Should be authenticated (require Supabase token or similar).

---

## Database Schema

### Table: `flipswitch_keys`

```sql
create table public.flipswitch_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  openrouter_key_id text not null,          -- OpenRouter's key ID (for PATCH/DELETE)
  openrouter_api_key text not null,         -- The actual sk-or-v1-... key
  credit_limit numeric default 0,           -- Current USD limit set on OpenRouter
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

alter table public.flipswitch_keys enable row level security;
create unique index idx_flipswitch_keys_user on public.flipswitch_keys(user_id) where revoked_at is null;
```

### Table: `flipswitch_auth_codes`

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

-- Auto-expire old codes (pg_cron or Edge Function cron):
-- delete from flipswitch_auth_codes where created_at < now() - interval '5 minutes';
```

### Table: `flipswitch_credits`

```sql
create table public.flipswitch_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_usd numeric not null,              -- positive = purchase, negative = adjustment
  source text not null,                     -- 'stripe', 'manual', 'refund', etc.
  stripe_payment_id text,                   -- Stripe reference if applicable
  created_at timestamptz not null default now()
);

alter table public.flipswitch_credits enable row level security;

-- Helper view for current balance
create or replace view public.flipswitch_balances as
select
  user_id,
  coalesce(sum(amount_usd), 0) as balance_usd
from public.flipswitch_credits
group by user_id;
```

---

## Credit Limit Sync

Vendo needs to keep each user's OpenRouter key limit in sync with their Vendo credit balance.

**When to update the limit:**
1. **User buys credits** (Stripe webhook) → PATCH the OR key limit to new balance
2. **User gets a refund** → PATCH the OR key limit down
3. **Periodic sync** (cron every 5-10 min) → query OR usage per key, compare against credits

**Querying usage from OpenRouter:**

```typescript
// GET https://openrouter.ai/api/v1/keys/{keyId}
const res = await fetch(`https://openrouter.ai/api/v1/keys/${keyId}`, {
  headers: { Authorization: `Bearer ${OPENROUTER_MANAGEMENT_KEY}` },
});
const { data } = await res.json();
// data.usage = total USD spent on this key
// data.limit = current limit
```

**Credit limit formula:**
```
OR key limit = user's Vendo credit balance / (1 + margin_percent)
```

Example with 20% margin:
- User buys $20 of credits on Vendo
- OR key limit set to $20 / 1.20 = $16.67
- User spends $16.67 on OpenRouter
- Vendo paid $16.67, collected $20, keeps $3.33

---

## Environment Variables

| Variable | Description |
|---|---|
| `OPENROUTER_MANAGEMENT_KEY` | Vendo's OpenRouter management key (for provisioning per-user keys) |
| `VENDO_MARGIN_PERCENT` | Margin on top of OpenRouter costs (e.g., `20` for 20%). Default: 20 |
| `FLIPSWITCH_DEFAULT_CREDIT` | Default credit for new users in USD (e.g., `0` — require purchase). Default: 0 |

---

## Billing / Margin Model

1. User buys $20 of credits on Vendo (via Stripe)
2. Vendo sets the OR key limit to `$20 / 1.20 = $16.67` (with 20% margin)
3. User makes API calls → OpenRouter deducts from the key's limit
4. When the limit runs out, OpenRouter rejects requests automatically (402 error)
5. User buys more credits → Vendo increases the OR key limit

**Vendo's revenue:**
- Vendo collects $20 from the user
- Vendo pays OpenRouter up to $16.67
- Vendo keeps $3.33 (20% margin)

**Safety:**
- OpenRouter enforces the credit limit — Vendo cannot be overcharged
- If a user doesn't pay, their key limit stays at $0 and nothing works
- Vendo can revoke keys instantly for any reason

---

## PKCE Reference

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

---

## Testing Checklist

1. **Auth flow** — `flipswitch login` opens browser, authenticates, returns a valid OpenRouter API key
2. **Key reuse** — Logging in on a second device returns the same key (not a new one)
3. **Credit limits** — OR key limit matches `user_credits / (1 + margin)`
4. **Limit enforcement** — When credits run out, OpenRouter returns 402 and Claude Code shows an error
5. **Credit purchase** — Buying credits on Vendo increases the OR key limit
6. **Key revocation** — `flipswitch logout` revokes the key, subsequent requests fail
7. **Margin math** — Verify Vendo collects more than it pays OpenRouter

---

## Optional Enhancements

- **Usage dashboard** — Query OpenRouter's per-key usage API and surface it in the Vendo UI
- **Low balance alerts** — Notify users when their OR key is near its limit
- **Tiered margins** — Lower margin for higher-volume users
- **Free trial** — Set a small initial credit limit (e.g., $1) for new signups
- **Referral tracking** — Add `?ref=` param support in the auth flow for growth tracking
- **Auto-top-up** — Let users configure automatic credit purchases when balance is low
