import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

const FEATURES = [
  {
    icon: "📦",
    title: "Die Geburtstagskiste – digital",
    text: "Wie die Kiste im Spielwarenladen, nur ohne Anfahrt: Das Geburtstagskind wählt aus, Gäste suchen sich ein Geschenk aus – online oder direkt im Laden um die Ecke.",
  },
  {
    icon: "💶",
    title: "Budget-Rahmen für Gäste",
    text: "Lege fest, was ein Geschenk kosten soll (z.B. 10–15 €). Gäste sehen zuerst passende Wünsche – kein unangenehmes Nachfragen in der Kita-WhatsApp-Gruppe.",
  },
  {
    icon: "🙈",
    title: "Überraschung bleibt Überraschung",
    text: "Wähle, ob du siehst, wer was schenkt – oder gar nichts bis nach dem Fest. Gäste sehen trotzdem, was schon vergeben ist. Keine doppelten Geschenke mehr.",
  },
  {
    icon: "🔓",
    title: "Gäste brauchen keinen Account",
    text: "Link per WhatsApp teilen, Gäste tippen auf „Ich schenke das“ – fertig. Ohne App, ohne Registrierung, auch für Oma.",
  },
  {
    icon: "✨",
    title: "KI-Ideen, die wirklich passen",
    text: "Alter, Interessen, No-Gos (z.B. kein Plastik, keine Süßigkeiten) und „hat schon“ – die KI schlägt nur Sinnvolles vor. Mit einem Tipp auf die Liste.",
  },
  {
    icon: "🤝",
    title: "Gruppengeschenke",
    text: "Das Fahrrad ist zu teuer für einen? Mehrere Gäste legen zusammen, der Fortschrittsbalken zeigt, wie viel noch fehlt.",
  },
  {
    icon: "💌",
    title: "Danke-Liste",
    text: "Nach dem Fest siehst du, wer was geschenkt hat, und hakst Dankeskarten ab. Erhaltenes wandert automatisch in „hat schon“.",
  },
  {
    icon: "🎄",
    title: "Ein Profil, alle Anlässe",
    text: "Geburtstag, Ostern, Weihnachten, Einschulung: mehrere Listen pro Kind. Offene Wünsche übernimmst du mit einem Klick in die nächste Liste.",
  },
];

export default async function Home() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <div className="space-y-12">
      <section className="py-8 text-center">
        <p className="chip mb-4">Für Eltern, Großeltern & Gäste</p>
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl">
          Die Geburtstagskiste fürs Handy.
          <br />
          <span style={{ color: "var(--color-brand-500)" }}>Weniger Organisationsstress, mehr Freude.</span>
        </h1>
        <p className="muted mx-auto mt-4 max-w-2xl text-lg">
          Wunschlisten fürs Kind anlegen, Ideen von der KI holen, Link in die Elterngruppe – und nie wieder drei
          gleiche Puzzles auf dem Gabentisch.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/register" className="btn text-lg">Erste Kiste packen</Link>
          <Link href="/login" className="btn-ghost text-lg">Ich habe schon ein Konto</Link>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <div key={f.title} className="card">
            <div className="text-3xl" aria-hidden>{f.icon}</div>
            <h2 className="mt-2 font-extrabold">{f.title}</h2>
            <p className="muted mt-1 text-sm">{f.text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
