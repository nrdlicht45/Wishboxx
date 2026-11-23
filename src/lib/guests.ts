/** Gleicht die Gästeliste (ein Name pro Zeile) mit Rückmeldungen ab – rein, ohne DB, testbar. */
const STOP = new Set(["familie", "fam", "mama", "papa", "oma", "opa", "und", "mit", "von", "die", "der"]);

export function matchInvitees(invitees: string, responders: string[]): { name: string; answered: boolean }[] {
  const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N} ]/gu, " ").replace(/\s+/g, " ").trim();
  const resp = responders.map(norm);
  return invitees
    .split(/\r?\n|,/)
    .map((n) => n.trim())
    .filter(Boolean)
    .map((name) => {
      // „Ben“ passt zu „Ben & Mama Julia“, „Familie Müller“ zu „Müllers“
      const keys = norm(name).split(" ").filter((w) => w && !STOP.has(w));
      const answered = keys.length > 0 && resp.some((r) => r.split(" ").some((w) => keys.some((k) => w === k || (k.length > 3 && w.length > 3 && (w.startsWith(k) || k.startsWith(w))))));
      return { name, answered };
    });
}
