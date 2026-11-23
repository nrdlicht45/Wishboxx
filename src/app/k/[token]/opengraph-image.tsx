import { ImageResponse } from "next/og";
import { getDb } from "@/lib/db";
import { getListByToken, OCCASIONS } from "@/lib/repo";
import { dateDe } from "@/lib/format";

export const alt = "Wishboxx Wunschboxx";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Vorschaubild für WhatsApp & Co.: Name, Anlass, Datum im Glow-Stil. */
export default async function OgImage({ params }: { params: Promise<{ token: string }> }) {
  const list = getListByToken((await params).token);
  const recipient = list?.recipient_id
    ? (getDb().prepare("SELECT name FROM recipients WHERE id = ?").get(list.recipient_id) as { name: string } | undefined)?.name
    : undefined;
  const title = list?.title ?? "Wishboxx";
  const sub = list
    ? [OCCASIONS[list.occasion], list.event_date ? dateDe(list.event_date) : null].filter(Boolean).join(" · ")
    : "Alle Wünsche. Alle Feste. Kopf frei.";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "linear-gradient(135deg, #fde7f4 0%, #f1ebff 45%, #ddf2ff 100%)",
          color: "#2a2140",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: "linear-gradient(135deg, #4f8bff, #a86bff, #f45fb0)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="8" width="18" height="13" rx="2" />
              <path d="M12 8v13M3 12h18M12 8c-1.5-3.5-6-4-6-1.2C6 9 12 8 12 8s6 1 6-1.2C18 4 13.5 4.5 12 8z" />
            </svg>
          </div>
          <div style={{ fontSize: 34, fontWeight: 700 }}>Wishboxx</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1 }}>{title}</div>
          <div
            style={{
              fontSize: 44,
              fontWeight: 700,
              backgroundImage: "linear-gradient(90deg, #4f8bff, #a86bff, #f45fb0)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            {recipient ? `Such dir ein Geschenk für ${recipient} aus` : "Such dir ein Geschenk aus"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 28, color: "#6b6282" }}>
          <div style={{ display: "flex", background: "#fff", borderRadius: 999, padding: "10px 24px" }}>{sub}</div>
          <div style={{ display: "flex", background: "#fff", borderRadius: 999, padding: "10px 24px" }}>ohne Anmeldung reservieren</div>
        </div>
      </div>
    ),
    size,
  );
}
