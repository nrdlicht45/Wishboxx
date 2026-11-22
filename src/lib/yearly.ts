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
