import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

const DraftSchema = z.object({
  understood: z.boolean(),
  name: z.string(),
  domains: z.string(),
  mode: z.enum(["param", "template"]),
  param_name: z.string(),
  param_value: z.string(),
  link_template: z.string(),
  search_url_template: z.string(),
  note: z.string(),
});
export type AiProviderDraft = z.infer<typeof DraftSchema>;

const SYSTEM = `Du hilfst dem Betreiber einer Wunschlisten-App, Affiliate-Partner einzurichten.
Die App kennt zwei Arten, Produktlinks umzuschreiben:
- "param": an den Produktlink des Shops wird ein Parameter angehängt (param_name=param_value), z.B. Amazon tag=xyz-21.
- "template": der Produktlink wird URL-kodiert in eine Deeplink-Vorlage eingesetzt; in link_template steht {url} an der Stelle der Ziel-URL.
Regeln:
- Verwende ausschließlich IDs, Parameter und Hosts, die wörtlich in der Eingabe vorkommen. Erfinde niemals Partner- oder Händler-IDs.
- "domains": die Shop-Domain(s), komma-getrennt, ohne https:// und ohne www.
- "search_url_template": Such-URL des Shops mit {query}, nur wenn du dir sicher bist, sonst leer lassen.
- Wenn die Eingabe nicht reicht, setze understood=false und erkläre in "note" auf Deutsch in einem Satz, was fehlt.
- "note": ein kurzer deutscher Hinweis, was der Betreiber prüfen sollte.`;

/** KI-Rückfallebene, wenn das Link-Format nicht automatisch erkannt wurde. */
export async function draftProviderWithAi(input: string, domainHint: string): Promise<AiProviderDraft | { error: string }> {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return { error: "Das Format wurde nicht automatisch erkannt, und die KI ist nicht eingerichtet (ANTHROPIC_API_KEY). Bitte die Felder unten von Hand ausfüllen." };
  }
  try {
    const client = new Anthropic();
    const res = await client.beta.messages.parse({
      model: process.env.AI_MODEL || "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: zodOutputFormat(DraftSchema) },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Shop-Domain (falls bekannt): ${domainHint || "unbekannt"}\n\nBeispiel-Link oder Anleitung aus dem Partnerprogramm:\n${input.slice(0, 4000)}`,
        },
      ],
    });
    if (res.stop_reason === "refusal" || !res.parsed_output) return { error: "Die KI konnte den Link nicht auswerten." };
    if (!res.parsed_output.understood) return { error: res.parsed_output.note || "Die KI konnte den Link nicht zuordnen." };
    return res.parsed_output;
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.error("Claude API error", err.status, err.message);
      return { error: "KI gerade nicht erreichbar – bitte von Hand ausfüllen." };
    }
    console.error(err);
    return { error: "KI gerade nicht erreichbar – bitte von Hand ausfüllen." };
  }
}
