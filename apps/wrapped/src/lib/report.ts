import { Originators, createApiClient } from "@model-match/api";
import type { BreakdownRow, MonthPoint, WrappedData } from "./types.ts";

/**
 * Server-only: aggregate one originator's year into a `WrappedData`.
 *
 * IMPORTANT: Model Match API keys authenticate via the `x-api-key` header —
 * NOT `Authorization: Bearer`. Several data-API routes reject the Bearer form.
 * The key lives only here (a server module); it never reaches the browser.
 */

export interface BuildWrappedOptions {
  apiKey: string;
  baseUrl: string;
  nmlsId: string;
  year: number;
}

function auth(apiKey: string): { headers: Record<string, string> } {
  return { headers: { "x-api-key": apiKey } };
}

/** hey-api returns { data, error }; throw a readable error on failure. */
function unwrap<T>(res: { data?: T; error?: unknown }, what: string): T {
  if (res.error !== undefined || res.data === undefined) {
    throw new Error(`Model Match API: ${what} failed — ${JSON.stringify(res.error ?? "no data")}`);
  }
  return res.data;
}

function toRows(items: Array<{ label: string; volume: number; units: number; pctVolume: number }> | undefined): BreakdownRow[] {
  return (items ?? []).slice(0, 5).map((i) => ({
    label: i.label,
    volume: i.volume,
    units: i.units,
    pctVolume: i.pctVolume,
  }));
}

function pctGrowth(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return (current - previous) / previous;
}

export async function buildWrapped(opts: BuildWrappedOptions): Promise<WrappedData> {
  const { apiKey, baseUrl, nmlsId, year } = opts;
  const client = createApiClient({ baseUrl });
  const period = String(year) as never; // Period is a union of year strings
  const sortByVolume = [{ field: "volume", order: "desc" }] as never;

  // Essential calls — a failure here means we can't build the report, so let
  // it throw (the route's errorComponent shows the message).
  const [detailRes, summaryRes, seriesRes] = await Promise.all([
    Originators.get({ client, path: { nmlsId }, query: { period }, ...auth(apiKey) }),
    Originators.analyticsSummary({ client, body: { nmlsId, period }, ...auth(apiKey) }),
    Originators.analyticsTimeSeries({
      client,
      body: { nmlsId, period, interval: "monthly", measure: "volume" },
      ...auth(apiKey),
    }),
  ]);

  const detail = unwrap(detailRes, "originator detail").data;
  const summary = unwrap(summaryRes, "analytics summary");
  const series = unwrap(seriesRes, "time series");

  // Breakdowns are nice-to-have — real data is spotty, so a single failing
  // breakdown just drops that slide instead of nuking the whole Wrapped.
  const breakdown = async (
    call: () => Promise<{ data?: { data?: BreakdownRow[] }; error?: unknown }>,
  ): Promise<BreakdownRow[]> => {
    try {
      const res = await call();
      return res.error !== undefined ? [] : toRows(res.data?.data);
    } catch {
      return [];
    }
  };

  const [topStates, topCities, topLenders] = await Promise.all([
    breakdown(() => Originators.statesBreakdown({ client, path: { nmlsId }, body: { period, sort: sortByVolume }, ...auth(apiKey) })),
    breakdown(() => Originators.citiesBreakdown({ client, path: { nmlsId }, body: { period, sort: sortByVolume }, ...auth(apiKey) })),
    breakdown(() => Originators.lenders({ client, path: { nmlsId }, body: { period, sort: sortByVolume }, ...auth(apiKey) })),
  ]);

  const months: MonthPoint[] = (series.current ?? []).map((b) => ({
    date: b.date,
    volume: b.volume,
    units: b.units,
  }));

  const biggestMonth = months.reduce<MonthPoint | null>((best, m) => {
    if (m.volume <= 0) return best;
    return best === null || m.volume > best.volume ? m : best;
  }, null);

  const cur = summary.current;
  const prev = summary.previous;

  return {
    meta: {
      nmlsId,
      name: detail.name ?? `NMLS #${nmlsId}`,
      company: detail.companyName ?? null,
      year,
      demo: false,
    },
    headline: { volume: cur.volume, units: cur.units, avgLoan: cur.avgPrice },
    yoy: {
      volumePrev: prev.volume,
      unitsPrev: prev.units,
      volumeGrowthPct: pctGrowth(cur.volume, prev.volume),
      unitsGrowthPct: pctGrowth(cur.units, prev.units),
    },
    months,
    biggestMonth,
    topStates,
    topCities,
    topLenders,
    mix: {
      purchaseVolume: detail.purchaseVolume ?? null,
      refinanceVolume: detail.refinanceVolume ?? null,
      purchaseUnits: detail.purchaseUnits ?? null,
      refinanceUnits: detail.refinanceUnits ?? null,
    },
  };
}
