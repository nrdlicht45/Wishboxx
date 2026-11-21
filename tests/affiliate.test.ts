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
