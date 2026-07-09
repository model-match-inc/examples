import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_REPO,
  envExample,
  netlifyToml,
  renderRegistryModule,
} from "../packages/create/src/gen.ts";
import { discoverTemplates } from "../packages/create/src/registry.ts";

/**
 * Regenerate every derived artifact from the `template.json` manifests:
 *   - <app>/netlify.toml
 *   - <app>/.env.example
 *   - packages/create/src/templates.generated.ts  (registry the CLI bundles)
 *
 * Run: `npm run gen` (needs Node >= 22.6 for native TypeScript).
 */

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const appsDir = join(root, "apps");

const templates = discoverTemplates(appsDir);
if (templates.length === 0) {
  console.warn("No template.json files found under apps/.");
}

for (const t of templates) {
  const appDir = join(root, t.dir);
  writeFileSync(join(appDir, "netlify.toml"), netlifyToml(t), "utf8");
  writeFileSync(join(appDir, ".env.example"), envExample(t), "utf8");
  console.log(`  ${t.dir}: netlify.toml + .env.example`);
}

const registryPath = join(root, "packages/create/src/templates.generated.ts");
writeFileSync(registryPath, renderRegistryModule(templates, DEFAULT_REPO), "utf8");
console.log(`Wrote registry (${templates.length} templates) -> ${registryPath}`);
