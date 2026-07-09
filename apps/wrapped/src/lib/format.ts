const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 1,
});

const full = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const decimal = new Intl.NumberFormat("en-US");

export function moneyCompact(n: number): string {
  return compact.format(n);
}

export function moneyFull(n: number): string {
  return full.format(n);
}

export function num(n: number): string {
  return decimal.format(n);
}

export function pct(fraction: number, digits = 0): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}

/** "2025-06-01" -> "June" (parsed as UTC to avoid timezone drift). */
export function monthName(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  const d = new Date(Date.UTC(y ?? 2025, (m ?? 1) - 1, 1));
  return d.toLocaleString("en-US", { month: "long", timeZone: "UTC" });
}
