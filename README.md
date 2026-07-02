# Model Match OAuth demos

Two tiny apps that show the two OAuth flows you'll see in the wild,
built on top of [`@model-match/oauth`](https://www.npmjs.com/package/@model-match/oauth)
and [`@model-match/api`](https://www.npmjs.com/package/@model-match/api).

> **Full Model Match developer docs:**
> [docs.modelmatch.com/developers](https://docs.modelmatch.com/developers)

| App | Flow | Where the secret lives | Use this when… |
| --- | --- | --- | --- |
| [`apps/tanstack-confidential`](./apps/tanstack-confidential) | **Authorization Code** w/ `client_secret` | On your server only | You have a backend (TanStack Start, Next, Remix, Express…) and can keep a secret |
| [`apps/vite-spa-pkce`](./apps/vite-spa-pkce) | **Authorization Code + PKCE** | **No secret** | Pure browser / mobile / CLI apps where you can't store a secret |

Both apps end the flow the same way: they call `Agents.list({...})` from
`@model-match/api` with the freshly-minted access token and render a few
agents on a page. That's the whole demo — the interesting part is **how the
token got there**.

## OAuth 2.0 Authorization Code in 30 seconds

```
┌──────────┐     1. /authorize?client_id=…&code_challenge=…       ┌──────────┐
│          │ ──────────────────────────────────────────────────▶ │          │
│  Your    │                                                      │  Model   │
│  App     │ ◀───────  2. redirects back with ?code=XYZ  ──────── │  Match   │
│          │                                                      │  Auth    │
│          │ ──── 3. POST /token  { code, code_verifier OR ─────▶ │  Server  │
│          │                        client_secret }               │          │
│          │ ◀──────── 4. { access_token, refresh_token } ─────── │          │
└──────────┘                                                      └──────────┘
     │
     │ 5. Authorization: Bearer <access_token>
     ▼
┌──────────┐
│ Model    │
│ Match    │
│ API      │
└──────────┘
```

- **Confidential client** (server-side): step 3 sends `client_id` + **`client_secret`**.
- **Public client / PKCE** (browser): no secret exists. Step 1 sends a hashed
  `code_challenge`, step 3 proves you have the matching `code_verifier`.
  This prevents anyone who intercepts the redirect `code` from redeeming it.

## Repo layout

```
.
├── README.md           ← you are here
└── apps/
    ├── tanstack-confidential/   ← demo #1
    └── vite-spa-pkce/           ← demo #2
```

Each app is fully self-contained — no workspaces / lockfile sharing. Pick
one, `cd` in, `npm install`, copy `.env.example` to `.env`, and read its
README.

## Prereqs

1. A Model Match OAuth application registered (see
   [docs.modelmatch.com/developers](https://docs.modelmatch.com/developers)).
   You'll need:
   - `client_id` (both apps)
   - `client_secret` (confidential app only)
   - One redirect URI per app:
     - `http://localhost:3000/oauth/callback` (TanStack Start)
     - `http://localhost:5173/oauth/callback` (Vite SPA)
   - Allowed scopes — at minimum the product scope you'll exercise
     (e.g. `market-insights:read`), plus `openid profile email` if you
     want the user badge to populate from the `id_token`.
2. Node 20+ and npm 10+.

## Further reading

- **Developer docs** — [docs.modelmatch.com/developers](https://docs.modelmatch.com/developers)
- **`@model-match/oauth`** — [npm](https://www.npmjs.com/package/@model-match/oauth) — the OAuth helper used by both apps
- **`@model-match/api`** — [npm](https://www.npmjs.com/package/@model-match/api) — the typed REST client
