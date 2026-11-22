import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { applyAffiliate, isSafeHttpUrl } from "@/lib/affiliate";
import { getActiveProviders, getProviders } from "@/lib/repo";
import { deleteProvider } from "@/app/actions";
import { ProviderForm } from "@/components/ProviderForm";
import { ProviderWizard } from "@/components/ProviderWizard";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ test?: string; neu?: string }> }) {
  await requireAdmin();
  const { test, neu } = await searchParams;
  const db = getDb();
  const providers = getProviders();
  const stats = db
    .prepare(
      `SELECT (SELECT COUNT(*) FROM users) AS users, (SELECT COUNT(*) FROM lists) AS lists,
        (SELECT COUNT(*) FROM items) AS items, (SELECT COUNT(*) FROM reservations) AS reservations,
        (SELECT COUNT(*) FROM clicks WHERE created_at > datetime('now','-30 days')) AS clicks30`,
    )
    .get() as Record<string, number>;
  const clicks = db
    .prepare(
      `SELECT COALESCE(p.name, 'ohne Partner') AS name, COUNT(*) AS c FROM clicks c
       LEFT JOIN affiliate_providers p ON p.id = c.provider_id
       WHERE c.created_at > datetime('now','-30 days') GROUP BY p.id ORDER BY c DESC`,
    )
    .all() as { name: string; c: number }[];
  const unmatched = db
    .prepare(
      `SELECT url FROM items WHERE url IS NOT NULL ORDER BY id DESC LIMIT 500`,
    )
    .all() as { url: string }[];
  const active = getActiveProviders();
  const hosts = new Map<string, number>();
  for (const { url } of unmatched) {
    if (applyAffiliate(url, active).provider) continue;
    try {
      const h = new URL(url).hostname.replace(/^www\./, "");
      hosts.set(h, (hosts.get(h) ?? 0) + 1);
    } catch {}
  }
  const topUnmatched = [...hosts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const testResult = test && isSafeHttpUrl(test) ? applyAffiliate(test, active) : null;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl">Admin</h1>

      <section className="grid gap-3 sm:grid-cols-5">
        {[
          ["Nutzer", stats.users],
          ["Listen", stats.lists],
          ["Wünsche", stats.items],
          ["Reservierungen", stats.reservations],
          ["Shop-Klicks (30 T.)", stats.clicks30],
        ].map(([label, value]) => (
          <div key={label} className="card">
            <div className="muted text-xs font-bold">{label}</div>
            <div className="text-2xl">{value}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="card">
          <h2 className="mb-2">Klicks nach Partner (30 Tage)</h2>
          {clicks.length === 0 ? <p className="muted text-sm">Noch keine Klicks.</p> : (
            <ul className="space-y-1 text-sm">
              {clicks.map((c) => <li key={c.name} className="flex justify-between"><span>{c.name}</span><strong>{c.c}</strong></li>)}
            </ul>
          )}
        </div>
        <div className="card">
          <h2 className="mb-2">Shops ohne Affiliate-Partner</h2>
          <p className="muted mb-2 text-xs">Diese Domains kommen in Wunschlisten vor, verdienen aber noch nichts.</p>
          {topUnmatched.length === 0 ? <p className="muted text-sm">Alles abgedeckt.</p> : (
            <ul className="space-y-1 text-sm">
              {topUnmatched.map(([h, c]) => (
                <li key={h} className="flex items-center justify-between gap-2">
                  <span>{h} <strong className="muted">({c})</strong></span>
                  <a className="underline" href={`/admin?neu=${encodeURIComponent(h)}#neuer-partner`}>Partner anlegen</a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="font-bold">Link-Tester</h2>
        <form className="flex gap-2">
          <input className="input" name="test" type="url" defaultValue={test} placeholder="https://www.amazon.de/dp/B0…" />
          <button className="btn" type="submit">Prüfen</button>
        </form>
        {testResult && (
          <p className="break-all text-sm">
            Partner: <strong>{testResult.provider?.name ?? "keiner"}</strong>
            <br />→ {testResult.url}
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl">Affiliate-Partner</h2>
        <p className="muted text-sm">
          Links werden beim Klick über <code>/go/…</code> automatisch mit der Partner-ID versehen – Änderungen gelten
          sofort für alle bestehenden Listen. Bei mehreren passenden Partnern gewinnt die niedrigste Priorität.
        </p>
        {providers.map((p) => (
          <details key={p.id} className="card">
            <summary className="flex cursor-pointer items-center justify-between gap-2">
              <span className="font-bold">{p.name}</span>
              <span className={p.active ? "chip chip-ok" : "chip"}>{p.active ? "aktiv" : "inaktiv"}</span>
            </summary>
            <div className="mt-4 space-y-3">
              <ProviderForm p={p} />
              <form action={deleteProvider}>
                <input type="hidden" name="id" value={p.id} />
                <button className="text-sm text-red-600 underline" type="submit">Partner löschen</button>
              </form>
            </div>
          </details>
        ))}
        <div className="card" id="neuer-partner">
          <h3 className="mb-1">Neuer Shop / Partner</h3>
          <ProviderWizard initialDomain={neu ?? ""} />
        </div>
      </section>
    </div>
  );
}
