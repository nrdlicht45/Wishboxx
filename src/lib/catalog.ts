/**
 * Regelbasierter Fallback-Katalog für Geschenkvorschläge, falls kein
 * ANTHROPIC_API_KEY gesetzt ist oder die KI nicht erreichbar ist.
 */
export interface GiftIdea {
  title: string;
  description: string;
  reason: string;
  price_estimate: number;
  category: string;
  search_query: string;
}

interface CatalogEntry extends GiftIdea {
  minAge: number;
  maxAge: number;
  tags: string[];
  gender?: "girl" | "boy";
}

const C: CatalogEntry[] = [
  { title: "Holz-Stapelturm", description: "Bunter Regenbogen-Stapelturm aus Holz", reason: "Fördert Feinmotorik", price_estimate: 15, category: "Spielzeug", search_query: "Regenbogen Stapelturm Holz", minAge: 1, maxAge: 3, tags: ["bauen", "kreativ"] },
  { title: "Tonie-Figur", description: "Hörfigur für die Toniebox mit Liedern oder Geschichten", reason: "Ideal fürs Budget der Gäste", price_estimate: 15, category: "Hörspiel", search_query: "Tonie Figur", minAge: 2, maxAge: 8, tags: ["hörspiel", "musik", "geschichten", "tonie"] },
  { title: "Wimmelbuch", description: "Großformatiges Wimmelbuch zum Entdecken", reason: "Gemeinsames Anschauen & Sprechen", price_estimate: 14, category: "Buch", search_query: "Wimmelbuch", minAge: 2, maxAge: 5, tags: ["bücher", "lesen"] },
  { title: "Duplo Starter-Set", description: "Große Bausteine für kleine Hände", reason: "Klassiker, erweiterbar", price_estimate: 25, category: "Bauen", search_query: "LEGO DUPLO Set", minAge: 2, maxAge: 5, tags: ["bauen", "lego", "duplo"] },
  { title: "Kinder-Malset im Koffer", description: "Buntstifte, Wachsmaler & Block im Koffer", reason: "Kreativität für unterwegs", price_estimate: 18, category: "Basteln", search_query: "Malkoffer Kinder", minAge: 3, maxAge: 9, tags: ["malen", "basteln", "kreativ"] },
  { title: "Laufrad-Klingel & Wimpel", description: "Zubehör fürs Laufrad oder Fahrrad", reason: "Kleines Budget, große Freude", price_estimate: 10, category: "Draußen", search_query: "Kinder Fahrradklingel Wimpel", minAge: 2, maxAge: 6, tags: ["fahrrad", "draußen", "sport"] },
  { title: "Memory-Spiel", description: "Bild-Memory mit Lieblingsmotiven", reason: "Spielt die ganze Familie", price_estimate: 10, category: "Spiele", search_query: "Kinder Memory Spiel", minAge: 3, maxAge: 8, tags: ["spiele", "brettspiele"] },
  { title: "Tiptoi Buch", description: "Interaktives Lernbuch für den Tiptoi-Stift", reason: "Spielerisch lernen", price_estimate: 18, category: "Lernen", search_query: "tiptoi Buch", minAge: 3, maxAge: 8, tags: ["lernen", "bücher", "tiptoi"] },
  { title: "LEGO Classic Steine-Box", description: "Mittelgroße Box mit bunten Steinen", reason: "Endlose Bauideen", price_estimate: 25, category: "Bauen", search_query: "LEGO Classic Steinebox", minAge: 4, maxAge: 12, tags: ["bauen", "lego", "kreativ"] },
  { title: "Bügelperlen-Set", description: "Steckperlen mit Vorlagen und Steckplatten", reason: "Ruhige Bastelzeit", price_estimate: 15, category: "Basteln", search_query: "Bügelperlen Set", minAge: 5, maxAge: 11, tags: ["basteln", "kreativ"] },
  { title: "Kinder-Fernglas", description: "Robustes Fernglas für kleine Entdecker", reason: "Für Natur- und Tierfans", price_estimate: 20, category: "Draußen", search_query: "Kinder Fernglas", minAge: 4, maxAge: 10, tags: ["tiere", "natur", "draußen", "forschen"] },
  { title: "Experimentierkasten", description: "Spannende Experimente für junge Forscher", reason: "Neugier & Wissenschaft", price_estimate: 25, category: "Lernen", search_query: "Experimentierkasten Kinder", minAge: 6, maxAge: 12, tags: ["forschen", "wissenschaft", "experimente", "lernen"] },
  { title: "Freundschaftsarmband-Set", description: "Knüpfgarn, Perlen und Anleitung", reason: "Zum Selbermachen und Verschenken", price_estimate: 12, category: "Basteln", search_query: "Freundschaftsarmbänder Set Kinder", minAge: 6, maxAge: 13, tags: ["basteln", "schmuck", "kreativ"] },
  { title: "Fußball Größe 4", description: "Robuster Trainingsball", reason: "Für Kicker im Verein oder Garten", price_estimate: 15, category: "Sport", search_query: "Fußball Größe 4 Kinder", minAge: 5, maxAge: 12, tags: ["fußball", "sport", "draußen"] },
  { title: "Kartenspiel UNO Junior / UNO", description: "Schneller Kartenspiel-Klassiker", reason: "Passt in jedes Budget", price_estimate: 9, category: "Spiele", search_query: "UNO Kartenspiel", minAge: 5, maxAge: 14, tags: ["spiele", "kartenspiele"] },
  { title: "Erstlesebuch", description: "Leseanfänger-Buch mit großer Schrift", reason: "Passend zum Schulstart", price_estimate: 9, category: "Buch", search_query: "Erstlesebuch 1. Klasse", minAge: 6, maxAge: 8, tags: ["lesen", "bücher", "schule"] },
  { title: "Comic / Graphic Novel", description: "Altersgerechter Comic-Band", reason: "Lesefreude für Lesemuffel", price_estimate: 12, category: "Buch", search_query: "Comic Kinder ab 8", minAge: 8, maxAge: 14, tags: ["lesen", "bücher", "comics"] },
  { title: "Rätselbuch / Escape-Buch", description: "Knifflige Rätsel zum Lösen", reason: "Für Tüftler", price_estimate: 12, category: "Spiele", search_query: "Escape Rätselbuch Kinder", minAge: 8, maxAge: 14, tags: ["rätsel", "forschen", "lesen"] },
  { title: "Kugelbahn-Erweiterung", description: "Erweiterungsset für bestehende Kugelbahnen", reason: "Wächst mit", price_estimate: 20, category: "Bauen", search_query: "Kugelbahn Erweiterung", minAge: 4, maxAge: 10, tags: ["bauen", "technik"] },
  { title: "Puppen-Zubehör", description: "Kleidung oder Zubehör für die Lieblingspuppe", reason: "Erweitert vorhandenes Spielzeug", price_estimate: 15, category: "Spielzeug", search_query: "Puppenkleidung Set", minAge: 3, maxAge: 8, tags: ["puppen", "rollenspiel"] },
  { title: "Spielfahrzeug-Set", description: "Robuste Fahrzeuge für Sandkasten & Kinderzimmer", reason: "Für kleine Fahrzeugfans", price_estimate: 15, category: "Spielzeug", search_query: "Spielzeugautos Set Kinder", minAge: 2, maxAge: 7, tags: ["autos", "fahrzeuge", "baustelle"] },
  { title: "Schleich-Tierfigur", description: "Detailreiche Tier- oder Pferdefigur", reason: "Sammeln & Rollenspiel", price_estimate: 10, category: "Spielzeug", search_query: "Schleich Tierfigur", minAge: 3, maxAge: 10, tags: ["tiere", "pferde", "dinos", "rollenspiel"] },
  { title: "Dino-Ausgrabungsset", description: "Dinosaurier-Skelett freilegen", reason: "Für Dino-Fans", price_estimate: 12, category: "Forschen", search_query: "Dino Ausgrabungsset", minAge: 5, maxAge: 11, tags: ["dinos", "forschen"] },
  { title: "Gutschein fürs Erlebnis", description: "Kino, Kletterhalle oder Zoo", reason: "Zeit statt Zeug", price_estimate: 20, category: "Erlebnis", search_query: "Erlebnisgutschein Kinder", minAge: 4, maxAge: 16, tags: ["erlebnis", "sport", "tiere"] },
];

const norm = (s: string) => s.toLowerCase().trim();

export function catalogSuggestions(opts: {
  age: number | null;
  gender: string;
  interests: string[];
  avoid: string[];
  owned: string[];
  budgetMax: number | null;
  exclude: string[];
  count?: number;
}): GiftIdea[] {
  const age = opts.age ?? 5;
  const interests = opts.interests.map(norm);
  const blocked = [...opts.avoid, ...opts.owned, ...opts.exclude].map(norm).filter(Boolean);

  return C.filter((e) => age >= e.minAge && age <= e.maxAge)
    .filter((e) => !(opts.budgetMax && e.price_estimate > opts.budgetMax * 1.2))
    .filter((e) => !blocked.some((b) => norm(e.title).includes(b) || e.tags.includes(b)))
    .map((e) => ({
      e,
      score:
        e.tags.filter((t) => interests.some((i) => t.includes(i) || i.includes(t))).length +
        // Treffer im Titel zählen doppelt (einfaches Stemming: "Dinos" -> "dino")
        2 * interests.filter((i) => i.length > 2 && norm(e.title).includes(i.replace(/(s|en|e|n)$/, ""))).length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, opts.count ?? 8)
    .map(({ e }) => ({
      title: e.title,
      description: e.description,
      reason: e.reason,
      price_estimate: e.price_estimate,
      category: e.category,
      search_query: e.search_query,
    }));
}
