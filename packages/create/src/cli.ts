#!/usr/bin/env node
import { existsSync, readdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  cancel,
  intro,
  isCancel,
  log,
  note,
  outro,
  password,
  select,
  spinner,
  text,
} from "@clack/prompts";
import { downloadTemplate } from "giget";
import { slugFor, netlifyDeployUrl, vercelDeployUrl } from "./gen.ts";
import type { TemplateManifest } from "./manifest.ts";
import { REPO, TEMPLATES } from "./templates.generated.ts";

/**
 * `npm create @model-match` — pick an example, answer its variables, scaffold
 * it, and (optionally) hand off to a deploy. Non-interactive when CLAUDECODE=1
 * or --yes: requires --template and --var for anything without a default.
 */

const isAgent = process.env.CLAUDECODE === "1";

interface Args {
  template?: string;
  dir?: string;
  vars: Record<string, string>;
  deploy?: string;
  yes: boolean;
}

function parseArgs(argv: string[]): Args {
  const out: Args = { vars: {}, yes: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const takeVar = (kv: string): void => {
      const eq = kv.indexOf("=");
      if (eq > 0) out.vars[kv.slice(0, eq)] = kv.slice(eq + 1);
    };
    if (a === "--template" || a === "-t") out.template = argv[++i];
    else if (a === "--dir" || a === "-d") out.dir = argv[++i];
    else if (a === "--deploy") out.deploy = argv[++i];
    else if (a === "--yes" || a === "-y") out.yes = true;
    else if (a === "--var") takeVar(argv[++i] ?? "");
    else if (a.startsWith("--var=")) takeVar(a.slice("--var=".length));
  }
  return out;
}

function bail(message: string): never {
  cancel(message);
  process.exit(1);
}

function unwrap<T>(value: T | symbol): T {
  if (isCancel(value)) bail("Cancelled.");
  return value as T;
}

function authNote(m: TemplateManifest): void {
  if (m.auth === "api-key") {
    note(`Create an API key in the Model Match dashboard, then set it in .env.\n${REPO.docsEnvLink}`, "Auth: API key");
  } else if (m.auth === "client-credentials") {
    note(
      `Create a client_credentials OAuth client (bound to your workspace) in the\ndashboard, then set its id + secret in .env.\n${REPO.docsEnvLink}`,
      "Auth: client credentials",
    );
  } else {
    note(
      `OAuth app. If it self-registers via DCR at first boot you're set — otherwise\nregister a client with your deployed redirect URI and set its client_id.\n${REPO.docsEnvLink}`,
      "Auth: OAuth",
    );
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const nonInteractive = isAgent || args.yes;

  intro("create-model-match");

  if (TEMPLATES.length === 0) bail("No templates available in this build.");

  // 1. Choose a template.
  let manifest: TemplateManifest | undefined;
  if (args.template !== undefined) {
    manifest = TEMPLATES.find((t) => slugFor(t) === args.template || t.name === args.template);
    if (manifest === undefined) {
      bail(`Unknown template "${args.template}". Available: ${TEMPLATES.map(slugFor).join(", ")}`);
    }
  } else if (nonInteractive) {
    bail(`Non-interactive mode needs --template <slug>. Available: ${TEMPLATES.map(slugFor).join(", ")}`);
  } else {
    const choice = unwrap(
      await select({
        message: "Which example do you want?",
        options: TEMPLATES.map((t) => ({ value: slugFor(t), label: t.name, hint: t.description })),
      }),
    );
    manifest = TEMPLATES.find((t) => slugFor(t) === choice);
  }
  if (manifest === undefined) bail("No template selected.");

  // 2. Collect variables.
  const values: Record<string, string> = {};
  for (const v of manifest.variables) {
    if (args.vars[v.key] !== undefined) {
      values[v.key] = args.vars[v.key];
      continue;
    }
    if (nonInteractive) {
      if (v.default !== undefined) {
        values[v.key] = v.default;
        continue;
      }
      bail(`Missing --var ${v.key}=… (required, no default).`);
    }
    const answer = v.secret
      ? await password({
          message: v.label,
          validate: (s) => (s !== undefined && s.length > 0 ? undefined : "required"),
        })
      : await text({
          message: v.label,
          placeholder: v.help ?? "",
          initialValue: v.default ?? "",
        });
    values[v.key] = unwrap(answer);
  }

  // 3. Target directory.
  const targetName = args.dir ?? slugFor(manifest);
  const target = resolve(process.cwd(), targetName);
  if (existsSync(target) && !nonInteractive) {
    const go = unwrap(
      await select({
        message: `"${targetName}" already exists — write into it anyway?`,
        options: [
          { value: "no", label: "Cancel" },
          { value: "yes", label: "Continue" },
        ],
      }),
    );
    if (go === "no") bail("Cancelled.");
  }

  // 4. Fetch the template from GitHub.
  const s = spinner();
  s.start(`Fetching ${manifest.name}…`);
  try {
    await downloadTemplate(`github:${REPO.githubRepo}/${manifest.dir}#${REPO.branch}`, {
      dir: target,
      force: true,
    });
    s.stop(`Fetched into ${targetName}/`);
  } catch (err) {
    s.stop("Fetch failed.");
    bail(err instanceof Error ? err.message : String(err));
  }

  // giget silently produces an empty directory when the subpath or branch
  // doesn't exist on the remote — guard against reporting a phantom success.
  const downloaded = (existsSync(target) ? readdirSync(target) : []).filter(
    (f) => f !== ".env" && f !== ".env.local",
  );
  if (downloaded.length === 0) {
    bail(
      `Nothing was downloaded. Is "${manifest.dir}" pushed to ${REPO.githubRepo} on branch "${REPO.branch}"?`,
    );
  }

  // 5. Write .env — but NEVER clobber an existing one. If the target already
  // has a .env (e.g. scaffolding into a live project), write to .env.local and
  // tell the user to merge, so real secrets are never overwritten.
  const count = Object.keys(values).length;
  const envBody = `${Object.entries(values)
    .map(([k, val]) => `${k}=${val}`)
    .join("\n")}\n`;
  if (existsSync(join(target, ".env"))) {
    await writeFile(join(target, ".env.local"), envBody, "utf8");
    log.warn(`.env already exists — left it untouched. Wrote your ${count} value(s) to .env.local; merge as needed.`);
  } else {
    await writeFile(join(target, ".env"), envBody, "utf8");
    log.success(`Wrote .env (${count} variable${count === 1 ? "" : "s"}).`);
  }

  // 6. What next?
  let deploy = args.deploy;
  if (deploy === undefined && !nonInteractive) {
    deploy = unwrap(
      await select({
        message: "Now what?",
        options: [
          { value: "local", label: "Run locally", hint: "npm install && npm run dev" },
          { value: "vercel", label: "Deploy to Vercel" },
          { value: "netlify", label: "Deploy to Netlify" },
          { value: "clone", label: "Just leave the files" },
        ],
      }),
    );
  }
  deploy = deploy ?? "local";

  const steps = [`cd ${targetName}`, "npm install"];
  if (deploy === "local") steps.push("npm run dev");
  note(steps.join("\n"), "Next steps");

  if (deploy === "vercel") log.info(`Deploy: ${vercelDeployUrl(manifest, REPO)}`);
  if (deploy === "netlify") log.info(`Deploy: ${netlifyDeployUrl(manifest, REPO)}`);

  authNote(manifest);
  outro("Done — happy building.");
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
