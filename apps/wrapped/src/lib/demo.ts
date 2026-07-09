import type { WrappedData } from "./types.ts";

/**
 * Bundled sample data — served when there is no API key so the app runs in
 * `npm run dev` and shows something real-looking on a fresh deploy. Hand-tuned
 * to a relatable residential LO (NOT a piped-in real record).
 */
export function demoWrapped(year: number, nmlsId = "000000"): WrappedData {
  const months = [
    { date: `${year}-01-01`, volume: 6_200_000, units: 17 },
    { date: `${year}-02-01`, volume: 7_100_000, units: 19 },
    { date: `${year}-03-01`, volume: 9_800_000, units: 26 },
    { date: `${year}-04-01`, volume: 11_400_000, units: 31 },
    { date: `${year}-05-01`, volume: 13_900_000, units: 38 },
    { date: `${year}-06-01`, volume: 15_200_000, units: 41 },
    { date: `${year}-07-01`, volume: 14_100_000, units: 38 },
    { date: `${year}-08-01`, volume: 12_700_000, units: 34 },
    { date: `${year}-09-01`, volume: 11_000_000, units: 29 },
    { date: `${year}-10-01`, volume: 9_400_000, units: 25 },
    { date: `${year}-11-01`, volume: 8_900_000, units: 24 },
    { date: `${year}-12-01`, volume: 8_700_000, units: 20 },
  ];
  return {
    meta: { nmlsId, name: "Jordan Rivera", company: "Summit Home Lending", year, demo: true },
    headline: { volume: 128_400_000, units: 342, avgLoan: 375_438 },
    yoy: {
      volumePrev: 102_000_000,
      unitsPrev: 289,
      volumeGrowthPct: 0.2588,
      unitsGrowthPct: 0.1834,
    },
    months,
    biggestMonth: { date: `${year}-06-01`, volume: 15_200_000, units: 41 },
    topStates: [
      { label: "CA", volume: 74_900_000, units: 191, pctVolume: 0.583 },
      { label: "AZ", volume: 28_100_000, units: 79, pctVolume: 0.219 },
      { label: "NV", volume: 15_400_000, units: 41, pctVolume: 0.12 },
      { label: "TX", volume: 6_800_000, units: 19, pctVolume: 0.053 },
      { label: "OR", volume: 3_200_000, units: 12, pctVolume: 0.025 },
    ],
    topCities: [
      { label: "Long Beach", volume: 22_400_000, units: 57, pctVolume: 0.174 },
      { label: "Phoenix", volume: 18_900_000, units: 53, pctVolume: 0.147 },
      { label: "Las Vegas", volume: 14_100_000, units: 38, pctVolume: 0.11 },
      { label: "Los Angeles", volume: 12_200_000, units: 29, pctVolume: 0.095 },
      { label: "San Diego", volume: 9_800_000, units: 23, pctVolume: 0.076 },
    ],
    topLenders: [
      { label: "United Wholesale Mortgage", volume: 43_700_000, units: 116, pctVolume: 0.34 },
      { label: "Rocket Mortgage", volume: 27_000_000, units: 72, pctVolume: 0.21 },
      { label: "Pennymac", volume: 20_500_000, units: 55, pctVolume: 0.16 },
      { label: "Fairway Independent Mortgage", volume: 14_100_000, units: 38, pctVolume: 0.11 },
      { label: "Guild Mortgage", volume: 10_300_000, units: 28, pctVolume: 0.08 },
    ],
    mix: {
      purchaseVolume: 100_152_000,
      refinanceVolume: 28_248_000,
      purchaseUnits: 267,
      refinanceUnits: 75,
    },
  };
}
