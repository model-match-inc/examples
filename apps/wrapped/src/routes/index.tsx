import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import type { WrappedData } from "~/lib/types";
import { Slides } from "~/components/Slides";

/**
 * Server function — runs ONLY on the server, so the API key never reaches the
 * browser. Reads config from env, resolves the target NMLS, and returns a
 * fully-aggregated `WrappedData`. Falls back to bundled demo data when no key
 * or NMLS is configured (so `npm run dev` and fresh deploys show something).
 */
const loadWrappedFn = createServerFn({ method: "GET" })
  .validator((input: { nmls?: string }) => input)
  .handler(async ({ data }): Promise<WrappedData> => {
    const { demoWrapped } = await import("~/lib/demo");

    const apiKey = process.env.MODEL_MATCH_API_KEY;
    const baseUrl = process.env.MMR_API_URL ?? "https://api.modelmatch.com";
    const year = Number(process.env.REPORT_YEAR ?? "2025");

    // The `?nmls=` override is a DEV-only convenience for previewing different
    // originators. On a public deploy it would let anyone burn the deployer's
    // API quota enumerating NMLS ids, so it is ignored outside dev.
    const overrideNmls = import.meta.env.DEV ? data.nmls : undefined;
    const nmlsId = overrideNmls ?? process.env.MODEL_MATCH_NMLS_ID;

    if (apiKey === undefined || apiKey === "" || nmlsId === undefined || nmlsId === "") {
      return demoWrapped(year, nmlsId);
    }

    const { buildWrapped } = await import("~/lib/report");
    return buildWrapped({ apiKey, baseUrl, nmlsId, year });
  });

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { nmls?: string } => ({
    nmls: typeof search.nmls === "string" ? search.nmls : undefined,
  }),
  loaderDeps: ({ search }) => ({ nmls: search.nmls }),
  loader: ({ deps }) => loadWrappedFn({ data: { nmls: deps.nmls } }),
  component: WrappedRoute,
  errorComponent: ({ error }) => (
    <div className="wrap-shell wrap-error">
      <div>
        <h1>Couldn&apos;t build your Wrapped</h1>
        <p>{error instanceof Error ? error.message : String(error)}</p>
        <p className="wrap-hint">
          Check <code>MODEL_MATCH_API_KEY</code> and <code>MODEL_MATCH_NMLS_ID</code>.
        </p>
      </div>
    </div>
  ),
});

function WrappedRoute() {
  const data = Route.useLoaderData();
  const [started, setStarted] = useState(false);

  if (!started) {
    return <Cover data={data} onStart={() => setStarted(true)} />;
  }
  return <Slides data={data} />;
}

function Cover({ data, onStart }: { data: WrappedData; onStart: () => void }) {
  // Auto-advance affordance: Enter/Space starts the story.
  const start = useCallback(() => onStart(), [onStart]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") start();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [start]);

  return (
    <div className="wrap-shell wrap-cover" onClick={start}>
      <div className="wrap-cover-inner">
        <p className="wrap-kicker">{data.meta.year} Wrapped</p>
        <h1 className="wrap-cover-name">{data.meta.name}</h1>
        {data.meta.company ? <p className="wrap-cover-co">{data.meta.company}</p> : null}
        <button type="button" className="wrap-cta" onClick={start}>
          Let&apos;s rewind your year →
        </button>
        {data.meta.demo ? (
          <p className="wrap-demo-badge">
            Demo data — set <code>MODEL_MATCH_API_KEY</code> +{" "}
            <code>MODEL_MATCH_NMLS_ID</code> for the real thing
          </p>
        ) : null}
      </div>
    </div>
  );
}
