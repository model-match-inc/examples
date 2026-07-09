# @model-match/create

Scaffold and deploy [Model Match](https://modelmatch.com) API example apps.

```bash
npm create @model-match
# or target a specific template
npm create @model-match -- --template company-report
```

## How it works

Every example under `apps/*` owns a `template.json` — the single source of
truth for its deploy-time variables and auth model. From it we generate the CLI
prompts, the Vercel/Netlify deploy-button URLs, each app's `netlify.toml` and
`.env.example`, and the "Deploy" buttons in the docs.

- **`src/manifest.ts`** — the `template.json` schema (Zod) + validator.
- **`src/gen.ts`** — pure generators (deploy URLs, `netlify.toml`,
  `.env.example`, docs buttons). No FS/network; unit-testable.
- **`src/registry.ts`** — filesystem discovery of `apps/*/template.json`.
- **`src/cli.ts`** — the clack CLI.
- **`src/templates.generated.ts`** — the registry the CLI bundles
  (produced by `npm run gen` at the repo root; do not edit).

## Non-interactive

```bash
CLAUDECODE=1 npm create @model-match -- \
  --template company-report \
  --var COMPANY_NMLS=123456 \
  --var MODEL_MATCH_API_KEY=mm_live_… \
  --deploy vercel
```

Anything without a `default` in the manifest must be supplied via `--var`.

## Regenerate derived files

After editing any `template.json`:

```bash
npm run gen        # from the repo root
```
