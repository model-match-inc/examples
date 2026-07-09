# Year in Review (Wrapped)

A Spotify-Wrapped-style year-in-review for a mortgage loan originator, built on
the [Model Match API](https://docs.modelmatch.com/developers). Give it an NMLS
ID and an API key and it renders an animated, click-through recap of the year:
total volume, loans funded, biggest month, where they lent, top lenders, and
purchase-vs-refi mix.

**Auth model:** API key. The key is read server-side (TanStack Start server
function) and sent as the `x-api-key` header — it is **never** shipped to the
browser. Only the aggregated numbers reach the client.

## Run it

```bash
npm install
cp .env.example .env      # optional — without a key it runs in demo mode
npm run dev               # http://localhost:3000
```

- **No key?** You still get a full Wrapped rendered from bundled sample data, so
  you can design/preview locally.
- **Real data?** Set `MODEL_MATCH_API_KEY` + `MODEL_MATCH_NMLS_ID` in `.env`.
- **Dev preview of other originators:** append `?nmls=1036297` (honored only in
  dev — ignored on a public deploy so nobody can enumerate against your key).

## Environment

| Var | Required | Notes |
| --- | --- | --- |
| `MODEL_MATCH_API_KEY` | for real data | Create in the Model Match dashboard. Server-side only. |
| `MODEL_MATCH_NMLS_ID` | for real data | The originator to feature. |
| `MMR_API_URL` | no | Defaults to `https://api.modelmatch.com`. |
| `REPORT_YEAR` | no | Defaults to `2025`. |

> **Deploy note:** `netlify.toml`/Vercel settings are generated from
> `template.json`. TanStack Start is SSR, so the Netlify publish directory /
> adapter for a button deploy still needs a real end-to-end deploy to confirm.
