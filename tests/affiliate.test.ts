import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAffiliate, buildSearchUrl, hostMatches, type AffiliateProvider } from "../src/lib/affiliate.ts";
import { parsePrice, extractMeta } from "../src/lib/metadata.ts";
import { catalogSuggestions } from "../src/lib/catalog.ts";

const base: AffiliateProvider = {
  id: 1, name: "Amazon", domains: "amazon.de, amzn.to", mode: "param", param_name: "tag",
  param_value: "wbx-21", link_template: "", search_url_template: "https://www.amazon.de/s?k={query}",
  use_for_suggestions: 1, active: 1, priority: 10,
};
const awin: AffiliateProvider = {
  ...base, id: 2, name: "myToys", domains: "mytoys.de", mode: "template",
  link_template: "https://www.awin1.com/cread.php?awinmid=1&awinaffid=2&ued={url}", priority: 20,
};

test("hostMatches erkennt Subdomains, aber keine Fremd-Domains", () => {
  assert.ok(hostMatches("www.amazon.de", "amazon.de"));
  assert.ok(hostMatches("smile.amazon.de", "amazon.de"));
  assert.ok(!hostMatches("notamazon.de", "amazon.de"));
});

test("Parameter-Modus setzt/ersetzt Tag", () => {
  const r = applyAffiliate("https://www.amazon.de/dp/B01?tag=fremd-21&th=1", [base]);
  assert.equal(r.provider?.id, 1);
  const u = new URL(r.url);
  assert.equal(u.searchParams.get("tag"), "wbx-21");
  assert.equal(u.searchParams.get("th"), "1");
});

test("Template-Modus kodiert Ziel-URL", () => {
  const r = applyAffiliate("https://www.mytoys.de/p/123?x=1", [base, awin]);
  assert.equal(r.provider?.name, "myToys");
  assert.ok(r.url.endsWith(encodeURIComponent("https://www.mytoys.de/p/123?x=1")));
});

test("Inaktive Partner und unbekannte Shops bleiben unverändert", () => {
  const url = "https://www.amazon.de/dp/B01";
  assert.equal(applyAffiliate(url, [{ ...base, active: 0 }]).url, url);
  assert.equal(applyAffiliate("https://example.com/x", [base]).provider, null);
  assert.equal(applyAffiliate("kein link", [base]).provider, null);
});

test("Such-URL für KI-Vorschläge", () => {
  assert.equal(buildSearchUrl("LEGO Pferd", [base]), "https://www.amazon.de/s?k=LEGO%20Pferd");
  assert.equal(buildSearchUrl("x", [{ ...base, use_for_suggestions: 0 }]), null);
});

test("Preise in deutschem und englischem Format", () => {
  assert.equal(parsePrice("12,99 €"), 12.99);
  assert.equal(parsePrice("1.299,00"), 1299);
  assert.equal(parsePrice("19.95"), 19.95);
  assert.equal(parsePrice(""), undefined);
});

test("Open-Graph-Metadaten werden gelesen", () => {
  const m = extractMeta(`<meta property="og:title" content="Puzzle &amp; Co"><meta property="og:image" content="https://x/img.jpg"><meta property="product:price:amount" content="14.99">`);
  assert.equal(m.title, "Puzzle & Co");
  assert.equal(m.image, "https://x/img.jpg");
  assert.equal(m.price, 14.99);
});

test("Katalog respektiert Alter, No-Gos und Budget", () => {
  const ideas = catalogSuggestions({ age: 6, gender: "girl", interests: ["Dinos"], avoid: ["lego"], owned: [], budgetMax: 15, exclude: [] });
  assert.ok(ideas.length > 0);
  assert.ok(ideas.every((i) => i.price_estimate <= 18));
  assert.ok(!ideas.some((i) => i.title.toLowerCase().includes("lego")));
  assert.match(ideas[0].title, /Dino/);
});

import { reminderDue, daysUntil, buildIcs } from "../src/lib/reminders.ts";
import { sniffImage } from "../src/lib/uploads.ts";

test("Erinnerungen: 7 und 2 Tage vorher, nie nach Kauf oder ohne E-Mail", () => {
  const now = new Date(2026, 11, 1); // 1.12.2026
  const base = { purchased: false, hasEmail: true, now };
  assert.equal(daysUntil("2026-12-08", now), 7);
  assert.equal(reminderDue({ ...base, eventDate: "2026-12-20", currentStage: 0 }), null);
  assert.equal(reminderDue({ ...base, eventDate: "2026-12-08", currentStage: 0 }), 1);
  assert.equal(reminderDue({ ...base, eventDate: "2026-12-08", currentStage: 1 }), null);
  assert.equal(reminderDue({ ...base, eventDate: "2026-12-03", currentStage: 1 }), 2);
  assert.equal(reminderDue({ ...base, eventDate: "2026-12-03", currentStage: 0 }), 2, "verpasste Stufe 1 wird übersprungen");
  assert.equal(reminderDue({ ...base, eventDate: "2026-12-03", currentStage: 2 }), null);
  assert.equal(reminderDue({ ...base, eventDate: "2026-11-30", currentStage: 0 }), null, "Feier vorbei");
  assert.equal(reminderDue({ ...base, eventDate: "2026-12-03", currentStage: 0, purchased: true }), null);
  assert.equal(reminderDue({ ...base, eventDate: "2026-12-03", currentStage: 0, hasEmail: false }), null);
});

test("ICS-Datei: ganztägig mit Alarm 3 Tage vorher, Sonderzeichen escaped", () => {
  const ics = buildIcs({ uid: "r1", date: "2026-12-31", title: "Party; Emma, 6", description: "x", url: "https://a/r/1" });
  assert.match(ics, /DTSTART;VALUE=DATE:20261231/);
  assert.match(ics, /DTEND;VALUE=DATE:20270101/);
  assert.match(ics, /TRIGGER:-P3D/);
  assert.match(ics, /SUMMARY:Party\; Emma\\, 6/);
});

test("Bildtyp wird an Magic Bytes erkannt, nicht an der Endung", () => {
  assert.equal(sniffImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0]))?.ext, "jpg");
  assert.equal(sniffImage(Buffer.from("<svg onload=alert(1)>"))?.ext, undefined);
});

import { parseSharedContent } from "../src/lib/share.ts";

test("Geteilter Text aus Shop-Apps wird in Link und Titel zerlegt", () => {
  const a = parseSharedContent({ text: "Schau mal, was ich bei Amazon gefunden habe: LEGO Friends Pferdestall https://amzn.eu/d/abc123" });
  assert.equal(a.url, "https://amzn.eu/d/abc123");
  assert.equal(a.title, "LEGO Friends Pferdestall");
  const b = parseSharedContent({ title: "Puzzle", url: "https://www.mytoys.de/p/1", text: "" });
  assert.deepEqual(b, { url: "https://www.mytoys.de/p/1", title: "Puzzle" });
});

import { nextYearTitle, plusOneYear } from "../src/lib/yearly.ts";

test("Folgejahr: Titel und Datum", () => {
  assert.equal(nextYearTitle("Emmas 6. Geburtstag"), "Emmas 7. Geburtstag");
  assert.equal(nextYearTitle("Weihnachten 2026"), "Weihnachten 2027");
  assert.equal(nextYearTitle("Bens Einschulung"), "Bens Einschulung");
  assert.equal(plusOneYear("2026-12-12"), "2027-12-12");
  assert.equal(plusOneYear("2028-02-29"), "2029-02-28");
  assert.equal(plusOneYear(null), null);
});

import { nextVolume } from "../src/lib/yearly.ts";
test("Fortsetzung merken schlägt den nächsten Band vor", () => {
  assert.equal(nextVolume("Die Schule der magischen Tiere Band 3"), "Die Schule der magischen Tiere Band 4");
  assert.equal(nextVolume("Tonie Teil 1"), "Tonie Teil 2");
  assert.equal(nextVolume("Dino-Set"), "Dino-Set – Fortsetzung");
});

import { detectProviderFromExample } from "../src/lib/affiliate.ts";
test("Partner aus Beispiel-Link: AWIN-Deeplink wird zur Vorlage", () => {
  const d = detectProviderFromExample(
    "https://www.awin1.com/cread.php?awinmid=12345&awinaffid=67890&ued=https%3A%2F%2Fwww.jako-o.de%2Fp%2F123",
  )!;
  assert.equal(d.mode, "template");
  assert.equal(d.domains, "jako-o.de");
  assert.equal(d.network, "AWIN");
  assert.equal(d.link_template, "https://www.awin1.com/cread.php?awinmid=12345&awinaffid=67890&ued={url}");
  // und die Vorlage funktioniert in der Engine
  const r = applyAffiliate("https://www.jako-o.de/p/999", [{ ...base, id: 9, name: d.name, domains: d.domains, mode: d.mode, link_template: d.link_template }]);
  assert.ok(r.url.endsWith(encodeURIComponent("https://www.jako-o.de/p/999")));
});
test("Partner aus Beispiel-Link: Amazon-Tag wird zum Parameter", () => {
  const d = detectProviderFromExample("https://www.amazon.de/dp/B0ABC?tag=meinname-21&linkCode=ll1")!;
  assert.equal(d.mode, "param");
  assert.equal(d.param_name, "tag");
  assert.equal(d.param_value, "meinname-21");
  assert.match(d.domains, /amzn\.to/);
});
test("Unbekanntes Format liefert null", () => {
  assert.equal(detectProviderFromExample("https://www.example.com/produkt/1"), null);
  assert.equal(detectProviderFromExample("kein link"), null);
});

test("Stichwortsuche im Katalog liefert nur passende Treffer", () => {
  const ideas = catalogSuggestions({ age: 6, gender: "none", interests: ["Pferde"], avoid: [], owned: [], budgetMax: null, exclude: [], strict: true });
  assert.ok(ideas.length >= 2);
  assert.ok(ideas.every((i) => /pferd|schleich|reiter/i.test(i.title + i.description)));
});

import { matchInvitees } from "../src/lib/guests.ts";
test("Gästeliste wird mit Rückmeldungen abgeglichen", () => {
  const r = matchInvitees("Ben\nMia\nFamilie Müller", ["Ben & Mama Julia", "Müllers"]);
  assert.deepEqual(r.map((x) => x.answered), [true, false, true]);
  const r2 = matchInvitees("Ben, Mia", ["mia"]);
  assert.deepEqual(r2.map((x) => x.answered), [false, true]);
});
