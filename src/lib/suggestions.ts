import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { catalogSuggestions, type GiftIdea } from "./catalog";
import { GENDERS, OCCASIONS } from "./repo";

export type { GiftIdea };

const IdeasSchema = z.object({
  ideas: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      reason: z.string(),
      price_estimate: z.number(),
      category: z.string(),
      search_query: z.string(),
    }),
  ),
});

export interface SuggestionInput {
  age: number | null;
  gender: string;
  interests: string[];
  avoid: string[];
  owned: string[];
  sizes: string;
  occasion: string;
  budgetMin: number | null;
  budgetMax: number | null;
  existingItems: string[];
  extraWish?: string;
  /** Stichwortsuche: im Katalog nur passende Treffer zeigen */
  strict?: boolean;
}

export interface SuggestionResult {
  ideas: GiftIdea[];
  source: "ai" | "catalog";
  note?: string;
}

const SYSTEM = `Du bist ein erfahrener Spielwaren- und Geschenkberater in Deutschland.
Du schlägst konkrete, im deutschen Handel erhältliche Geschenke vor, die zu Alter, Interessen und Anlass passen.
Regeln:
- Beachte das Budget pro Geschenk strikt (Preise in Euro, realistisch geschätzt).
- Schlage nichts vor, was auf der No-Go-Liste steht, schon vorhanden ist oder bereits auf der Wunschliste steht.
- Achte auf Altersfreigaben und Sicherheit (z.B. Kleinteile unter 3 Jahren).
- Mische Kategorien: Spielzeug, Bücher, Kreatives, Draußen/Bewegung, Erlebnisse.
- Bei Kindergeburtstagen: bevorzuge Geschenke, die einzelne Gäste gut allein kaufen können.
- "search_query" ist ein kurzer Suchbegriff (2-5 Wörter), mit dem man das Produkt in einem Online-Shop findet; keine Fantasie-Produktnamen.
- "reason" erklärt in einem Satz, warum es passt.
Antworte auf Deutsch.`;

function describe(input: SuggestionInput): string {
  const lines = [
    `Anlass: ${OCCASIONS[input.occasion] ?? input.occasion}`,
    `Alter: ${input.age ?? "unbekannt"}`,
    `Geschlecht: ${GENDERS[input.gender] ?? "keine Angabe"}`,
    `Interessen: ${input.interests.join(", ") || "keine Angabe"}`,
    `No-Gos (bitte vermeiden): ${input.avoid.join(", ") || "keine"}`,
    `Hat schon: ${input.owned.join(", ") || "keine Angabe"}`,
    `Größen: ${input.sizes || "keine Angabe"}`,
    `Budget pro Geschenk: ${input.budgetMin ?? 0} – ${input.budgetMax ?? "offen"} €`,
    `Bereits auf der Liste: ${input.existingItems.join("; ") || "nichts"}`,
  ];
  if (input.extraWish) lines.push(`Zusatzwunsch der Eltern: ${input.extraWish}`);
  return lines.join("\n");
}

export async function suggestGifts(input: SuggestionInput, count = 8): Promise<SuggestionResult> {
  const fallback = (note?: string): SuggestionResult => ({
    source: "catalog",
    note,
    ideas: catalogSuggestions({
      age: input.age,
      gender: input.gender,
      interests: input.interests,
      avoid: input.avoid,
      owned: input.owned,
      budgetMax: input.budgetMax,
      exclude: input.existingItems,
      count,
      strict: input.strict,
    }),
  });

  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return fallback("KI nicht konfiguriert – Vorschläge aus dem Basiskatalog.");
  }

  try {
    const client = new Anthropic();
    const response = await client.beta.messages.parse({
      model: process.env.AI_MODEL || "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: zodOutputFormat(IdeasSchema) },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Bitte schlage ${count} passende Geschenke vor.\n\n${describe(input)}`,
        },
      ],
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return fallback("KI konnte keine Vorschläge liefern – Basiskatalog verwendet.");
    }
    const existing = input.existingItems.map((s) => s.toLowerCase());
    const ideas = response.parsed_output.ideas
      .filter((i) => !existing.includes(i.title.toLowerCase()))
      .slice(0, count);
    return { source: "ai", ideas };
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return fallback("KI ist gerade ausgelastet – Basiskatalog verwendet.");
    }
    if (err instanceof Anthropic.APIError) {
      console.error("Claude API error", err.status, err.message);
      return fallback("KI-Fehler – Basiskatalog verwendet.");
    }
    console.error("Suggestion error", err);
    return fallback("KI nicht erreichbar – Basiskatalog verwendet.");
  }
}
