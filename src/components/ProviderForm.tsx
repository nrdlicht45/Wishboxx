import type { AffiliateProvider } from "@/lib/affiliate";
import { saveProvider } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";

export type ProviderFormValues = Partial<AffiliateProvider>;

export function ProviderForm({ p }: { p?: ProviderFormValues }) {
  return (
    <form action={saveProvider} className="grid gap-3 sm:grid-cols-6">
      {p?.id ? <input type="hidden" name="id" value={p.id} /> : null}
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
        <SubmitButton className="btn">{p?.id ? "Speichern" : "Partner anlegen"}</SubmitButton>
      </div>
    </form>
  );
}

