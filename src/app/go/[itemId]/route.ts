import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { applyAffiliate, isSafeHttpUrl } from "@/lib/affiliate";
import { getActiveProviders } from "@/lib/repo";

/**
 * Affiliate-Redirect: Hier – und nur hier – werden Partner-IDs angehängt.
 * Klicks werden pro Partner gezählt (Admin-Statistik).
 */
export async function GET(req: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const id = Number((await params).itemId);
  const db = getDb();
  const item = db.prepare("SELECT id, url FROM items WHERE id = ?").get(id) as { id: number; url: string | null } | undefined;
  if (!item?.url || !isSafeHttpUrl(item.url)) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  const { url, provider } = applyAffiliate(item.url, getActiveProviders());
  db.prepare("INSERT INTO clicks (item_id, provider_id) VALUES (?, ?)").run(item.id, provider?.id ?? null);
  return NextResponse.redirect(url, { status: 302, headers: { "Referrer-Policy": "no-referrer-when-downgrade" } });
}
