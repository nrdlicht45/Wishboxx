import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

/** Ergebnis der Produkterkennung aus einem Foto. */
const ProductSchema = z.object({
  recognized: z.boolean(),
  title: z.string(),
  brand: z.string(),
  description: z.string(),
  price_estimate: z.number(),
  search_query: z.string(),
  age_hint: z.string(),
});
export type RecognizedProduct = z.infer<typeof ProductSchema>;

const SYSTEM = `Du erkennst Spielzeug, Bücher und andere Geschenkartikel auf Fotos – z.B. aus dem Spielwarenladen, einem Prospekt, einem Katalog oder vom Bildschirm.
- "title": möglichst genauer Produktname inkl. Marke/Serie/Setnummer, falls lesbar (z.B. "LEGO Friends Pferdestall 42603").
- "brand": Marke oder leer.
- "description": ein kurzer Satz für Gäste, was es ist.
- "price_estimate": realistischer aktueller Preis in Euro in Deutschland (0, wenn unklar).
- "search_query": 2–6 Wörter, um genau dieses Produkt in einem Online-Shop zu finden.
- "age_hint": Altersangabe von der Verpackung, falls sichtbar, sonst leer.
- "recognized": false, wenn kein Produkt erkennbar ist (z.B. Personen, Landschaft) – dann übrige Felder leer bzw. 0.
Beschreibe niemals Personen auf dem Foto. Antworte auf Deutsch.`;

export async function recognizeProduct(
  data: Buffer,
  mediaType: "image/jpeg" | "image/png" | "image/webp",
): Promise<{ ok: true; product: RecognizedProduct } | { ok: false; error: string }> {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return { ok: false, error: "Die Foto-Erkennung braucht einen KI-Schlüssel (ANTHROPIC_API_KEY). Du kannst den Wunsch unten trotzdem mit dem Foto anlegen." };
  }
  try {
    const client = new Anthropic();
    const response = await client.beta.messages.parse({
      model: process.env.AI_MODEL || "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: zodOutputFormat(ProductSchema) },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: data.toString("base64") } },
            { type: "text", text: "Welches Produkt ist das? Fülle die Felder aus." },
          ],
        },
      ],
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return { ok: false, error: "Das Foto konnte nicht ausgewertet werden. Bitte Titel selbst eintragen." };
    }
    if (!response.parsed_output.recognized) {
      return { ok: false, error: "Auf dem Foto wurde kein Produkt erkannt. Tipp: Verpackung frontal und nah fotografieren." };
    }
    return { ok: true, product: response.parsed_output };
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return { ok: false, error: "Die KI ist gerade ausgelastet. Bitte gleich nochmal versuchen." };
    if (err instanceof Anthropic.APIError) {
      console.error("Claude API error", err.status, err.message);
      return { ok: false, error: "KI-Fehler bei der Foto-Erkennung." };
    }
    console.error("Vision error", err);
    return { ok: false, error: "Foto-Erkennung nicht erreichbar." };
  }
}
