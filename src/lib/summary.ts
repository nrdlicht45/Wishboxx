import { getDb } from "./db";
import { getItemsWithStatus, getRsvps, isItemTaken, type List } from "./repo";
import { matchInvitees } from "./guests";

/** Stand einer Boxx für die Inhaberin (Push/E-Mail) – verrät im Überraschungsmodus nichts über Geschenke. */
export function ownerSummary(listId: number): string {
  const list = getDb().prepare("SELECT * FROM lists WHERE id = ?").get(listId) as List;
  const items = getItemsWithStatus(listId);
  const rsvps = getRsvps(listId);
  const yes = rsvps.filter((r) => r.status === "yes").length;
  const parts: string[] = [];
  if (list.reveal_mode !== "surprise") parts.push(`${items.filter((i) => isItemTaken(i)).length} von ${items.length} Wünschen vergeben`);
  parts.push(`${yes} ${yes === 1 ? "Zusage" : "Zusagen"}`);
  const open = list.invitees ? matchInvitees(list.invitees, rsvps.map((r) => r.guest_name)).filter((g) => !g.answered).length : 0;
  if (open) parts.push(`${open} noch ohne Rückmeldung`);
  return parts.join(", ");
}
