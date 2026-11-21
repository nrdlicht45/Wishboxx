/**
 * Liest Titel, Bild und Preis aus einer Produktseite (Open Graph / JSON-LD),
 * damit Eltern nur einen Link einfügen müssen.
 */
import dns from "node:dns/promises";
import net from "node:net";
import { isSafeHttpUrl } from "./affiliate.ts";

/** Schutz vor SSRF: keine Abrufe auf interne/private Adressen. */
function isPrivateIp(ip: string): boolean {
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    if (v.startsWith("::ffff:")) return isPrivateIp(v.slice(7));
    return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80");
  }
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127)
  );
}

async function isPublicHost(hostname: string): Promise<boolean> {
  try {
    const addrs = await dns.lookup(hostname, { all: true });
    return addrs.length > 0 && addrs.every((a) => !isPrivateIp(a.address));
  } catch {
    return false;
  }
}

export interface ProductMeta {
  title?: string;
  image?: string;
  price?: number;
  description?: string;
}

function meta(html: string, prop: string): string | undefined {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${prop}["']`,
    "i",
  );
  const m = html.match(re);
  return decode(m?.[1] ?? m?.[2]);
}

function decode(s?: string): string | undefined {
  if (!s) return undefined;
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

export function parsePrice(raw?: string): number | undefined {
  if (!raw) return undefined;
  const cleaned = raw.replace(/[^\d.,]/g, "");
  if (!cleaned) return undefined;
  // "1.299,99" -> 1299.99 ; "12,99" -> 12.99 ; "12.99" -> 12.99
  const normalized =
    cleaned.includes(",") && cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")
      ? cleaned.replace(/\./g, "").replace(",", ".")
      : cleaned.replace(/,/g, "");
  const n = parseFloat(normalized);
  return isFinite(n) ? Math.round(n * 100) / 100 : undefined;
}

export function extractMeta(html: string): ProductMeta {
  const out: ProductMeta = {
    title: meta(html, "og:title") ?? decode(html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]),
    image: meta(html, "og:image"),
    description: meta(html, "og:description") ?? meta(html, "description"),
    price: parsePrice(meta(html, "product:price:amount") ?? meta(html, "og:price:amount")),
  };
  if (out.price == null) {
    const ld = html.match(/"price"\s*:\s*"?([\d.,]+)"?/);
    out.price = parsePrice(ld?.[1]);
  }
  if (out.title && out.title.length > 160) out.title = out.title.slice(0, 157) + "…";
  return out;
}

export async function fetchProductMeta(url: string): Promise<ProductMeta> {
  try {
    let current = url;
    let res: Response | null = null;
    // Redirects manuell folgen, damit jedes Ziel den SSRF-Check durchläuft.
    for (let hop = 0; hop < 4; hop++) {
      if (!isSafeHttpUrl(current) || !(await isPublicHost(new URL(current).hostname))) return {};
      res = await fetch(current, {
        signal: AbortSignal.timeout(6000),
        redirect: "manual",
        headers: {
          "user-agent": "Mozilla/5.0 (compatible; WishboxxBot/0.1)",
          "accept-language": "de-DE,de;q=0.9",
        },
      });
      const loc = res.headers.get("location");
      if (res.status >= 300 && res.status < 400 && loc) {
        current = new URL(loc, current).toString();
        continue;
      }
      break;
    }
    if (!res || !res.ok) return {};
    const html = (await res.text()).slice(0, 500_000);
    return extractMeta(html);
  } catch {
    return {};
  }
}
