export const currencies = [
  { code: "USD", symbol: "$",  name: "US Dollar" },
  { code: "GBP", symbol: "£",  name: "British Pound" },
  { code: "EUR", symbol: "€",  name: "Euro" },
  { code: "INR", symbol: "₹",  name: "Indian Rupee" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
];

export function getSymbol(code: string): string {
  return currencies.find((c) => c.code === code)?.symbol ?? "$";
}
