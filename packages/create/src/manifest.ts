import { z } from "zod";

/**
 * `template.json` — the single source of truth for one example app.
 *
 * From a manifest we generate: the Vercel deploy URL, the Netlify
 * `netlify.toml`, the `.env.example`, the docs "Deploy" buttons, and the CLI
 * prompts. Author this file; everything else is derived (`npm run gen`).
 */

export const VAR_SCOPES = ["build", "server"] as const;
export const AUTH_MODELS = ["api-key", "client-credentials", "oauth"] as const;
export const FRAMEWORKS = ["vite", "tanstack-start", "next", "node"] as const;

/**
 * One deploy-time variable. `key` is the literal env var name (including any
 * framework prefix like `VITE_`). Build-scoped vars are baked into the client
 * bundle; server-scoped vars stay server-side. Secrets are never prefilled.
 */
export const VariableSchema = z
  .object({
    key: z
      .string()
      .regex(
        /^[A-Z][A-Z0-9_]*$/,
        "env var keys must be SCREAMING_SNAKE_CASE (e.g. VITE_MODEL_MATCH_CLIENT_ID)",
      ),
    label: z.string().min(1),
    help: z.string().optional(),
    secret: z.boolean().default(false),
    default: z.string().optional(),
    scope: z.enum(VAR_SCOPES).default("server"),
  })
  .refine((v) => !(v.secret && v.default !== undefined), {
    message: "a secret variable must not declare a default (it would leak into URLs/repo)",
    path: ["default"],
  });

export const BuildSchema = z
  .object({
    command: z.string().optional(),
    publish: z.string().optional(),
  })
  .optional();

export const TemplateManifestSchema = z.object({
  name: z.string().min(1),
  /** Stable id + default target dir name. Defaults to `basename(dir)`. */
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, "slug must be kebab-case")
    .optional(),
  description: z.string().min(1),
  framework: z.enum(FRAMEWORKS),
  auth: z.enum(AUTH_MODELS),
  /** Path within the monorepo, e.g. "apps/company-report". */
  dir: z.string().min(1),
  /** Optional build overrides for netlify.toml (framework defaults otherwise). */
  build: BuildSchema,
  variables: z.array(VariableSchema).default([]),
});

export type Variable = z.infer<typeof VariableSchema>;
export type TemplateManifest = z.infer<typeof TemplateManifestSchema>;

/** Parse + validate a manifest, throwing a readable error on failure. */
export function parseManifest(input: unknown, source = "template.json"): TemplateManifest {
  const result = TemplateManifestSchema.safeParse(input);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid ${source}:\n${issues}`);
  }
  return result.data;
}
