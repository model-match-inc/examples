# Demo #1 — TanStack Start, confidential OAuth client

A tiny TanStack Start app that signs in with Model Match using a
**`client_id` + `client_secret`** (a.k.a. a "confidential" OAuth client).

> Full Model Match developer docs: [docs.modelmatch.co/developers](https://docs.modelmatch.co/developers)

## Why confidential?

You have a backend (this TanStack Start server). You can keep a secret
there — it never has to leak into the browser. That secret authenticates
your app to the Model Match token endpoint, so an attacker who steals the
intermediate `code` from the URL still can't redeem it for tokens.

If you're building a pure SPA / mobile app / CLI, you can't keep a
secret — **use PKCE instead**, demo #2.

## What you'll see

```
/                  ← "Sign in with Model Match" button
   │
   │ (server fn redirects to issuer)
   ▼
/authorize @ Model Match
   │
   │ (issuer redirects back with ?code=…&state=…)
   ▼
/oauth/callback    ← server-only loader exchanges code for tokens
   │                using client_secret, then sets httpOnly cookies
   ▼
/dashboard         ← server-only loader calls Agents.list via @model-match/api
                     using the cookie token; renders 5 agents
```

## Run it

```bash
cd apps/tanstack-confidential
cp .env.example .env
# edit .env and fill in MODEL_MATCH_CLIENT_ID + MODEL_MATCH_CLIENT_SECRET
npm install
npm run dev
# → http://localhost:3000
```

When registering the OAuth app in Model Match, the **redirect URI must be
exactly** `http://localhost:3000/oauth/callback`.

## Files worth reading

| File | What it shows |
| --- | --- |
| `src/lib/oauth.server.ts` | `createOAuthClient({ clientId, clientSecret, ... })` — secret stays here |
| `src/routes/index.tsx` | `createServerFn` builds the `/authorize` URL + sets a state cookie, then redirects |
| `src/routes/oauth.callback.tsx` | Verifies `state`, calls `oauth.exchangeCode({ code })`, writes httpOnly token cookies |
| `src/routes/dashboard.tsx` | Reads the cookie, calls `Agents.list` via `@model-match/api` server-side |

## The important security bits

1. **Never** import `oauth.server.ts` from a component or top-level route
   file — keep imports inside `createServerFn().handler` so Vite tree-shakes
   them out of the client bundle.
2. **Never** prefix the secret with `VITE_` — those env vars get inlined
   into the browser bundle.
3. Tokens live in `httpOnly`, `sameSite=lax` cookies so JS can't read them
   and they aren't sent on cross-site requests.
4. The `state` cookie protects against CSRF on the callback. Always verify.
