# Demo #2 — Vite SPA, PKCE OAuth flow

A pure-browser React app (Vite + React 19, no backend) that signs in with
Model Match using the **Authorization Code + PKCE** flow.

> Full Model Match developer docs: [docs.modelmatch.co/developers](https://docs.modelmatch.co/developers)

## Why PKCE?

There's no server here. We can't keep a `client_secret` — anyone can pop
DevTools and read it. PKCE replaces the static secret with a one-time
secret that:

- is freshly generated in your browser for every sign-in,
- never travels in cleartext (we send the SHA-256 hash on the way out),
- is proven on the way back by sending the original verifier.

That means even if an attacker intercepts the `code` from the redirect
URL, they can't redeem it without the verifier — which they don't have.

## What you'll see

```
/                  ← "Sign in with Model Match" button
   │
   │  createPKCE() → save verifier in sessionStorage
   │  → window.location = /authorize?code_challenge=…
   ▼
/authorize @ Model Match
   │
   │  (issuer redirects back with ?code=…&state=…)
   ▼
/oauth/callback    ← validates state, POSTs { code, code_verifier } to /token
   │                stores access_token in sessionStorage, then -> /dashboard
   ▼
/dashboard         ← calls Agents.list via @model-match/api with Bearer token
```

## Run it

```bash
cd apps/vite-spa-pkce
cp .env.example .env.local
# edit .env.local and fill in VITE_MODEL_MATCH_CLIENT_ID
npm install
npm run dev
# → http://localhost:5173
```

When registering the OAuth app in Model Match:

- The **redirect URI must exactly match** `http://localhost:5173/oauth/callback`.
- The app must be registered as a **public client** (no `client_secret`,
  PKCE required).

## Files worth reading

| File | What it shows |
| --- | --- |
| `src/lib/oauth.ts` | `createOAuthClient({ clientId, redirectUri })` — no secret |
| `src/pages/Login.tsx` | `createPKCE()`, store verifier in sessionStorage, redirect |
| `src/pages/Callback.tsx` | `parseOAuthCallback` + `oauth.exchangeCode({ code, codeVerifier })` |
| `src/pages/Dashboard.tsx` | `Agents.list(...)` with `Authorization: Bearer <token>` |

## The important security bits

1. The `code_verifier` lives in `sessionStorage` only between the redirect
   to the issuer and the return to `/oauth/callback`. We delete it
   immediately after exchanging it.
2. We also store and verify a random `state` value to defeat CSRF — if the
   issuer's redirect doesn't carry back the exact `state` we set, we abort.
3. The access token sits in `sessionStorage`. That's fine for a demo, but
   in production:
   - Prefer keeping the token **only in memory** to limit XSS exposure.
   - Use short-lived access tokens and use `oauth.refreshToken({...})` to
     get fresh ones.
   - If your tenant requires it, consider a BFF (backend-for-frontend) and
     httpOnly cookies — at which point you're back to demo #1's pattern.

## Why no `client_secret`?

PKCE replaces the secret. From the issuer's perspective:

| Confidential client | Public client (PKCE) |
| --- | --- |
| App proves itself with `client_secret` | App proves itself with `code_verifier` whose SHA-256 matches the earlier `code_challenge` |
| Secret is static (issued once) | Verifier is per-flow (generated each sign-in) |
| Requires a trusted backend | Works in a browser / mobile / CLI |
