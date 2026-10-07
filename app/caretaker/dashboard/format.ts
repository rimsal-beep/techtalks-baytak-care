/** "$1,250" or "LBP 1,500,000". Works on the server and in the browser. */
export function money(n: number, currency: string = "USD") {
  const text = (Math.round(n * 100) / 100).toLocaleString("en-US", {
    minimumFractionDigits: n % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return currency === "LBP" ? `LBP ${text}` : `$${text}`;
}

export function shortDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function longDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
