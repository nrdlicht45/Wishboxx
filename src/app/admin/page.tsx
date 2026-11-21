import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { applyAffiliate, isSafeHttpUrl, type AffiliateProvider } from "@/lib/affiliate";
import { getActiveProviders, getProviders } from "@/lib/repo";
import { SubmitButton } from "@/components/SubmitButton";
import { deleteProvider, saveProvider } from "@/app/actions";

function ProviderForm({ p }: { p?: AffiliateProvider }) {
  return (
    <form action={saveProvider} className="grid gap-3 sm:grid-cols-6">
      {p && <input type="hidden" name="id" value={p.id} />}
      <div className="sm:col-span-2">
        <label className="label">Name</label>
        <input className="input" name="name" required defaultValue={p?.name} placeholder="Amazon.de" />
      </div>
      <div className="sm:col-span-3">
        <label className="label">Domains (Komma-getrennt)</label>
        <input className="input" name="domains" required defaultValue={p?.domains} placeholder="amazon.de, amzn.to" />
      </div>
      <div>
        <label className="label">Priorität</label>
        <input className="input" name="priority" type="number" defaultValue={p?.priority ?? 100} />
      </div>
      <div className="sm:col-span-2">
        <label className="label">Modus</label>
        <select className="input" name="mode" defaultValue={p?.mode ?? "param"}>
          <option value="param">Parameter anhängen (z.B. Amazon ?tag=)</option>
          <option value="template">Deeplink-Vorlage (AWIN, Tradedoubler, …)</option>
        </select>
      </div>
      <div>
        <label className="label">Param-Name</label>
        <input className="input" name="param_name" defaultValue={p?.param_name} placeholder="tag" />
      </div>
      <div className="sm:col-span-3">
        <label className="label">Param-Wert / Partner-ID</label>
        <input className="input" name="param_value" defaultValue={p?.param_value} placeholder="wishboxx-21" />
      </div>
      <div className="sm:col-span-6">
        <label className="label">Deeplink-Vorlage – {"{url}"} wird durch den kodierten Produktlink ersetzt</label>
        <input className="input" name="link_template" defaultValue={p?.link_template}
          placeholder="https://www.awin1.com/cread.php?awinmid=123&awinaffid=456&ued={url}" />
      </div>
      <div className="sm:col-span-6">
        <label className="label">Such-URL für KI-Vorschläge – {"{query}"} = Suchbegriff</label>
        <input className="input" name="search_url_template" defaultValue={p?.search_url_template}
          placeholder="https://www.amazon.de/s?k={query}" />
      </div>
      <div className="sm:col-span-6 flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="active" defaultChecked={!!p?.active} /> aktiv
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="use_for_suggestions" defaultChecked={!!p?.use_for_suggestions} /> für KI-Vorschläge verwenden
        </label>
        <SubmitButton className="btn">{p ? "Speichern" : "Partner anlegen"}</SubmitButton>
      </div>
    </form>
  );
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ test?: string }> }) {
  await requireAdmin();
  const { test } = await searchParams;
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
      <h1 className="text-3xl font-extrabold">Admin</h1>

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
            <div className="text-2xl font-extrabold">{value}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="card">
          <h2 className="mb-2 font-extrabold">Klicks nach Partner (30 Tage)</h2>
          {clicks.length === 0 ? <p className="muted text-sm">Noch keine Klicks.</p> : (
            <ul className="space-y-1 text-sm">
              {clicks.map((c) => <li key={c.name} className="flex justify-between"><span>{c.name}</span><strong>{c.c}</strong></li>)}
            </ul>
          )}
        </div>
        <div className="card">
          <h2 className="mb-2 font-extrabold">Shops ohne Affiliate-Partner</h2>
          <p className="muted mb-2 text-xs">Diese Domains kommen in Wunschlisten vor, verdienen aber noch nichts.</p>
          {topUnmatched.length === 0 ? <p className="muted text-sm">Alles abgedeckt 🎉</p> : (
            <ul className="space-y-1 text-sm">
              {topUnmatched.map(([h, c]) => <li key={h} className="flex justify-between"><span>{h}</span><strong>{c}</strong></li>)}
            </ul>
          )}
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="font-extrabold">Link-Tester</h2>
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
        <h2 className="text-xl font-extrabold">Affiliate-Partner</h2>
        <p className="muted text-sm">
          Links werden beim Klick über <code>/go/…</code> automatisch mit der Partner-ID versehen – Änderungen gelten
          sofort für alle bestehenden Listen. Bei mehreren passenden Partnern gewinnt die niedrigste Priorität.
        </p>
        {providers.map((p) => (
          <details key={p.id} className="card">
            <summary className="flex cursor-pointer items-center justify-between gap-2">
              <span className="font-extrabold">{p.name}</span>
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
        <div className="card">
          <h3 className="mb-3 font-extrabold">Neuer Partner</h3>
          <ProviderForm />
        </div>
      </section>
    </div>
  );
}
