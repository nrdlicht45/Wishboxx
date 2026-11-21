/**
 * Affiliate-Engine: versieht Produktlinks automatisch mit den Partner-IDs
 * des App-Anbieters. Bewusst frei von DB-Imports, damit sie isoliert testbar ist.
 *
 * Links werden NICHT beim Speichern umgeschrieben, sondern erst beim Klick
 * (Route /go/[itemId]). So wirken Änderungen im Admin-Bereich sofort auch auf
 * alle bestehenden Wunschlisten.
 */

export type AffiliateMode = "param" | "template";

export interface AffiliateProvider {
  id: number;
  name: string;
  domains: string; // komma-separiert, z.B. "amazon.de,amzn.to"
  mode: AffiliateMode | string;
  param_name: string;
  param_value: string;
  link_template: string; // z.B. "https://www.awin1.com/cread.php?...&ued={url}"
  search_url_template: string; // z.B. "https://www.amazon.de/s?k={query}"
  use_for_suggestions: number;
  active: number;
  priority: number;
}

export function parseDomains(domains: string): string[] {
  return domains
    .split(/[,\s]+/)
    .map((d) => d.trim().toLowerCase().replace(/^www\./, ""))
    .filter(Boolean);
}

export function hostMatches(hostname: string, domain: string): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  return host === domain || host.endsWith("." + domain);
}

export function findProvider<T extends AffiliateProvider>(url: string, providers: T[]): T | null {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return null;
  }
  const candidates = providers
    .filter((p) => p.active)
    .filter((p) => parseDomains(p.domains).some((d) => hostMatches(host, d)))
    .sort((a, b) => a.priority - b.priority);
  return candidates[0] ?? null;
}

export function buildAffiliateUrl(url: string, provider: AffiliateProvider): string {
  if (provider.mode === "template") {
    if (!provider.link_template.includes("{url}")) return url;
    return provider.link_template.replaceAll("{url}", encodeURIComponent(url));
  }
  if (!provider.param_name || !provider.param_value) return url;
  const u = new URL(url);
  u.searchParams.set(provider.param_name, provider.param_value);
  return u.toString();
}

/** Liefert den (ggf.) affiliierten Link sowie den verwendeten Partner. */
export function applyAffiliate<T extends AffiliateProvider>(
  url: string,
  providers: T[],
): { url: string; provider: T | null } {
  const provider = findProvider(url, providers);
  if (!provider) return { url, provider: null };
  return { url: buildAffiliateUrl(url, provider), provider };
}

/** Baut für einen KI-Vorschlag einen Such-Link beim bevorzugten Partner. */
export function buildSearchUrl(query: string, providers: AffiliateProvider[]): string | null {
  const p = providers
    .filter((x) => x.active && x.use_for_suggestions && x.search_url_template.includes("{query}"))
    .sort((a, b) => a.priority - b.priority)[0];
  if (!p) return null;
  return p.search_url_template.replaceAll("{query}", encodeURIComponent(query));
}

/** Sicherheitscheck: nur http(s)-Links zulassen. */
export function isSafeHttpUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
