import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Icon, IconBubble } from "@/components/Icon";

const FEATURES = [
  {
    icon: "gift",
    title: "Eine Boxx für jedes Fest",
    text: "Geburtstag, Weihnachten, Ostern, Einschulung: Wünsche sammeln, Gäste suchen sich etwas aus – online oder im Laden um die Ecke. Wie die Geschenkekiste im Spielwarenladen, nur ohne Anfahrt.",
  },
  {
    icon: "wallet",
    title: "Budget-Rahmen für Gäste",
    text: "Lege fest, was ein Geschenk kosten soll (z.B. 10–15 €). Gäste sehen zuerst passende Wünsche – kein unangenehmes Nachfragen in der Kita-WhatsApp-Gruppe.",
  },
  {
    icon: "eyeoff",
    title: "Überraschung bleibt Überraschung",
    text: "Wähle, ob du siehst, wer was schenkt – oder gar nichts bis nach dem Fest. Gäste sehen trotzdem, was schon vergeben ist. Keine doppelten Geschenke mehr.",
  },
  {
    icon: "link",
    title: "Gäste brauchen keinen Account",
    text: "Link per WhatsApp teilen, Gäste tippen auf „Ich schenke das“ – fertig. Ohne App, ohne Registrierung, auch für Oma.",
  },
  {
    icon: "sparkle",
    title: "KI-Ideen, die wirklich passen",
    text: "Alter, Interessen, No-Gos (z.B. kein Plastik, keine Süßigkeiten) und „hat schon“ – die KI schlägt nur Sinnvolles vor. Mit einem Tipp auf die Liste.",
  },
  {
    icon: "users",
    title: "Gruppengeschenke",
    text: "Das Fahrrad ist zu teuer für einen? Mehrere Gäste legen zusammen, der Fortschrittsbalken zeigt, wie viel noch fehlt.",
  },
  {
    icon: "mail",
    title: "Danke-Liste",
    text: "Nach dem Fest siehst du, wer was geschenkt hat, und hakst Dankeskarten ab. Erhaltenes wandert automatisch in „hat schon“.",
  },
  {
    icon: "calendar",
    title: "Ein Profil, alle Anlässe",
    text: "Geburtstag, Ostern, Weihnachten, Einschulung: mehrere Listen pro Kind. Offene Wünsche übernimmst du mit einem Klick in die nächste Liste.",
  },
];

export default async function Home() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <div className="space-y-14">
      <section className="flex flex-col items-center gap-5 py-8 text-center">
        <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold"
          style={{ background: "color-mix(in srgb, var(--card) 70%, transparent)" }}>
          <Icon name="heart" size={15} /> Geburtstag · Weihnachten · Ostern · Einschulung
        </span>
        <h1 className="max-w-3xl text-4xl leading-tight sm:text-6xl">
          Alle Wünsche. Alle Feste. <span className="g">Kopf frei.</span>
        </h1>
        <p className="muted max-w-2xl text-lg">
          Wishboxx merkt sich, was sich deine Kinder wünschen, schlägt Passendes vor, teilt die Liste mit allen Gästen und
          erinnert sie ans Kaufen – damit du nicht an alles denken musst.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/start" className="btn text-lg">Erste Boxx packen – in 60 Sekunden</Link>
          <Link href="/login" className="btn-ghost text-lg">Anmelden</Link>
        </div>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-medium">
          <span className="inline-flex items-center gap-2"><span className="dot" />ohne Konto starten</span>
          <span className="inline-flex items-center gap-2"><span className="dot" />Gäste brauchen keine App</span>
          <span className="inline-flex items-center gap-2"><span className="dot" />nie wieder doppelte Geschenke</span>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-center text-3xl">Du denkst an alles. <span className="g">Wishboxx denkt mit.</span></h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="card space-y-2">
              <IconBubble name={f.icon} />
              <h3 className="font-bold">{f.title}</h3>
              <p className="muted text-sm">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="banner flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="display text-2xl">Bereit für das nächste Fest?</p>
          <p className="mt-1 text-sm opacity-90">Drei Fragen, die KI packt die Ideen ein – kein Konto nötig.</p>
        </div>
        <Link href="/start" className="inline-flex min-h-11 items-center rounded-full bg-white px-5 font-semibold" style={{ color: "#2a2140" }}>
          Jetzt starten
        </Link>
      </section>
    </div>
  );
}
