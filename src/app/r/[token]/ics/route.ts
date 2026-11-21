import { getReservationByToken } from "@/lib/repo";
import { buildIcs } from "@/lib/reminders";
import { appUrl } from "@/lib/format";

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const ctx = getReservationByToken((await params).token);
  if (!ctx?.list.event_date) return new Response("Nicht gefunden", { status: 404 });
  const { reservation: r, item, list } = ctx;
  const ics = buildIcs({
    uid: `res-${r.id}`,
    date: list.event_date!,
    title: `${list.title} – Geschenk: ${item.title}`,
    description: `Du schenkst: ${item.title}. Verwalten: ${appUrl()}/r/${r.token}`,
    url: `${appUrl()}/r/${r.token}`,
  });
  return new Response(ics, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="wishboxx-${r.id}.ics"`,
    },
  });
}
