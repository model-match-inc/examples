/** The fully-aggregated payload the client renders as "Wrapped" slides. */
export interface WrappedData {
  meta: {
    nmlsId: string;
    name: string;
    company: string | null;
    year: number;
    /** True when served from the bundled sample data (no API key). */
    demo: boolean;
  };
  headline: {
    volume: number;
    units: number;
    /** Average loan amount (summary.avgPrice). */
    avgLoan: number;
  };
  yoy: {
    volumePrev: number;
    unitsPrev: number;
    /** null when the prior year had zero volume (growth undefined). */
    volumeGrowthPct: number | null;
    unitsGrowthPct: number | null;
  };
  /** 12 monthly buckets (may contain zeros / gaps). */
  months: MonthPoint[];
  /** Highest-volume month, or null if the whole year is empty. */
  biggestMonth: MonthPoint | null;
  topStates: BreakdownRow[];
  topCities: BreakdownRow[];
  topLenders: BreakdownRow[];
  mix: {
    purchaseVolume: number | null;
    refinanceVolume: number | null;
    purchaseUnits: number | null;
    refinanceUnits: number | null;
  };
}

export interface MonthPoint {
  /** ISO first-of-month, e.g. "2025-03-01". */
  date: string;
  volume: number;
  units: number;
}

export interface BreakdownRow {
  label: string;
  volume: number;
  units: number;
  /** Share of total volume, 0–1. */
  pctVolume: number;
}
