import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parseManifest, type TemplateManifest } from "./manifest.ts";

/**
 * Filesystem discovery of templates — used by the repo codegen. Reads every
 * `apps/<x>/template.json`, validates it, and returns the manifests sorted by
 * slug. The CLI itself does NOT use this (it imports the generated registry so
 * it needs no local checkout).
 */
export function discoverTemplates(appsDir: string): TemplateManifest[] {
  if (!existsSync(appsDir)) return [];
  const out: TemplateManifest[] = [];
  for (const entry of readdirSync(appsDir)) {
    const dir = join(appsDir, entry);
    if (!statSync(dir).isDirectory()) continue;
    const manifestPath = join(dir, "template.json");
    if (!existsSync(manifestPath)) continue;
    const raw: unknown = JSON.parse(readFileSync(manifestPath, "utf8"));
    out.push(parseManifest(raw, `${entry}/template.json`));
  }
  return out.sort((a, b) => (a.slug ?? a.dir).localeCompare(b.slug ?? b.dir));
}
