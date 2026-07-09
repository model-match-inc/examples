/**
 * Isolation test for the real-data path — the one thing typecheck and demo
 * mode can't prove. Calls `buildWrapped` directly against the live API with a
 * real key + NMLS and prints the aggregated result, so a 401 (wrong header),
 * a bad SDK call shape, or an unexpected field shows up here with a readable
 * error — decoupled from the SSR/hydration stack.
 *
 *   MODEL_MATCH_API_KEY=… MODEL_MATCH_NMLS_ID=1036297 npm run smoke
 *
 * Needs Node >= 22.6 (native TypeScript).
 */
import { buildWrapped } from "../src/lib/report.ts";

const apiKey = process.env.MODEL_MATCH_API_KEY;
const nmlsId = process.env.MODEL_MATCH_NMLS_ID;
const baseUrl = process.env.MMR_API_URL ?? "https://api.modelmatch.com";
const year = Number(process.env.REPORT_YEAR ?? "2025");

if (apiKey === undefined || apiKey === "" || nmlsId === undefined || nmlsId === "") {
  console.error("Set MODEL_MATCH_API_KEY and MODEL_MATCH_NMLS_ID (optionally MMR_API_URL, REPORT_YEAR).");
  process.exit(1);
}

const data = await buildWrapped({ apiKey, baseUrl, nmlsId, year });
console.log(JSON.stringify(data, null, 2));
console.error(
  `\nOK — ${data.meta.name}: ${(data.headline.volume / 1e6).toFixed(1)}M across ${data.headline.units} loans, ` +
    `${data.topStates.length} states / ${data.topLenders.length} lenders.`,
);
