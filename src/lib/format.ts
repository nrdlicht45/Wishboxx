export const euro = (n: number | null | undefined) =>
  n == null ? "" : n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });

export const dateDe = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" }) : "";

export function appUrl(): string {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}
