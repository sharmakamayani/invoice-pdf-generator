// Live currency exchange rates via the free, no-key Frankfurter API,
// with a graceful fallback to a small set of static rates if offline.

const FALLBACK_RATES: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, INR: 83.3, AUD: 1.52, CAD: 1.36,
  JPY: 157, CNY: 7.24, AED: 3.67, SGD: 1.35, CHF: 0.89, ZAR: 18.5,
};

export interface RateResult {
  rate: number;
  source: "live" | "fallback";
  date: string;
}

/**
 * Fetch the exchange rate from `from` to `to`.
 * Returns 1 if same currency. Falls back to static rates on failure.
 */
export async function fetchRate(from: string, to: string): Promise<RateResult> {
  if (from === to) return { rate: 1, source: "fallback", date: new Date().toISOString().split("T")[0] };

  try {
    const res = await fetch(
      `https://api.frankfurter.app/latest?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      { cache: "no-store" }
    );
    if (res.ok) {
      const json = await res.json();
      const rate = json?.rates?.[to];
      if (typeof rate === "number") {
        return { rate, source: "live", date: json.date ?? "" };
      }
    }
  } catch {
    // fall through to fallback
  }

  // Fallback: derive cross-rate via USD
  const fromR = FALLBACK_RATES[from];
  const toR = FALLBACK_RATES[to];
  if (fromR && toR) {
    return { rate: toR / fromR, source: "fallback", date: new Date().toISOString().split("T")[0] };
  }
  return { rate: 1, source: "fallback", date: new Date().toISOString().split("T")[0] };
}
