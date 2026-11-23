/** Reine Helfer fürs Folgejahr (ohne DB, testbar). */

/** Nächster Titel fürs Folgejahr: „Emmas 6. Geburtstag“ → „Emmas 7. Geburtstag“. */
export function nextYearTitle(title: string): string {
  const m = title.match(/(\d+)\.(\s*Geburtstag)/);
  if (m) return title.replace(m[0], `${Number(m[1]) + 1}.${m[2]}`);
  const y = title.match(/\b(20\d\d)\b/);
  if (y) return title.replace(y[1], String(Number(y[1]) + 1));
  return title;
}

export function plusOneYear(date: string | null): string | null {
  if (!date) return null;
  const [y, m, d] = date.split("-").map(Number);
  // 29.02. → 28.02. im Nicht-Schaltjahr
  const last = new Date(Date.UTC(y + 1, m, 0)).getUTCDate();
  return `${y + 1}-${String(m).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
}

/** Vorschlag für „Fortsetzung merken“: „Band 1“ → „Band 2“, sonst „… – Fortsetzung“. */
export function nextVolume(title: string): string {
  const m = title.match(/\b(Band|Teil|Folge|Vol\.?|Nr\.?)\s*(\d+)/i);
  if (m) return title.replace(m[0], `${m[1]} ${Number(m[2]) + 1}`);
  return `${title} – Fortsetzung`;
}

/** Lebenszyklus einer Boxx nach dem Fest (Tage relativ zum Fest-Datum). */
export const CLOSE_AFTER_DAYS = 3; // Gäste-Link schließt 3 Tage nach dem Fest
export const ARCHIVE_AFTER_DAYS = 30; // automatisch archivieren, offene Wünsche → Merkzettel

/** Tage seit dem Fest (positiv = vorbei), null ohne Datum. */
export function daysSince(eventDate: string | null, now = new Date()): number | null {
  if (!eventDate) return null;
  const [y, m, d] = eventDate.split("-").map(Number);
  const event = Date.UTC(y, m - 1, d);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((today - event) / 864e5);
}

/** Ist der Gäste-Link geschlossen? */
export function isClosedForGuests(eventDate: string | null, now = new Date()): boolean {
  const s = daysSince(eventDate, now);
  return s != null && s >= CLOSE_AFTER_DAYS;
}

/** Datum, an dem der Gäste-Link schließt (YYYY-MM-DD). */
export function closingDate(eventDate: string | null): string | null {
  if (!eventDate) return null;
  const [y, m, d] = eventDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + CLOSE_AFTER_DAYS)).toISOString().slice(0, 10);
}
