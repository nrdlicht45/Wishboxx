/**
 * Erinnerungs-Logik (rein, ohne DB – testbar).
 * Stufe 1: 7 Tage vor der Feier, Stufe 2: 2 Tage vorher.
 * Wer „gekauft“ markiert hat, bekommt nichts mehr.
 */
export const REMINDER_STAGES = [
  { stage: 1, daysBefore: 7 },
  { stage: 2, daysBefore: 2 },
] as const;

export function daysUntil(eventDate: string, now = new Date()): number {
  const [y, m, d] = eventDate.split("-").map(Number);
  const event = Date.UTC(y, m - 1, d);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((event - today) / 864e5);
}

/** Liefert die Stufe, die jetzt verschickt werden soll – oder null. */
export function reminderDue(opts: {
  eventDate: string | null;
  purchased: boolean;
  currentStage: number;
  hasEmail: boolean;
  now?: Date;
}): number | null {
  if (!opts.eventDate || opts.purchased || !opts.hasEmail) return null;
  const days = daysUntil(opts.eventDate, opts.now);
  if (days < 0) return null;
  let due: number | null = null;
  for (const s of REMINDER_STAGES) {
    if (days <= s.daysBefore && opts.currentStage < s.stage) due = s.stage;
  }
  return due;
}

/** iCalendar-Datei mit Erinnerung 3 Tage vorher (funktioniert ganz ohne E-Mail-Versand). */
export function buildIcs(opts: { uid: string; date: string; title: string; description: string; url: string }): string {
  const d = opts.date.replaceAll("-", "");
  const [y, m, day] = opts.date.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, day + 1)).toISOString().slice(0, 10).replaceAll("-", "");
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Wishboxx//DE",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${opts.uid}@wishboxx`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${d}`,
    `DTEND;VALUE=DATE:${next}`,
    `SUMMARY:${esc(opts.title)}`,
    `DESCRIPTION:${esc(opts.description)}`,
    `URL:${opts.url}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc("Geschenk schon besorgt? " + opts.title)}`,
    "TRIGGER:-P3D",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
