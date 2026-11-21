import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "./actions";

export const metadata: Metadata = {
  title: "Wishboxx – die digitale Geburtstagskiste",
  description:
    "Wunschlisten für Kinder & Familien: KI-Geschenkideen, Reservieren ohne Account, Gruppengeschenke und Danke-Liste.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f9681a" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <html lang="de">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased">
        <header className="border-b" style={{ borderColor: "var(--line)" }}>
          <nav className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
            <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 text-xl font-extrabold">
              <span aria-hidden>🎁</span> Wishboxx
            </Link>
            <div className="flex items-center gap-2 text-sm">
              {user ? (
                <>
                  <Link href="/dashboard" className="btn-ghost">Meine Kisten</Link>
                  {user.is_admin ? <Link href="/admin" className="btn-ghost">Admin</Link> : null}
                  <form action={logout}>
                    <button className="btn-ghost" type="submit">Abmelden</button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login" className="btn-ghost">Anmelden</Link>
                  <Link href="/register" className="btn">Kostenlos starten</Link>
                </>
              )}
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 pb-10 pt-6 text-xs muted">
          * Mit Sternchen markierte Links sind Affiliate-Links. Kaufst du darüber ein, erhält Wishboxx eine kleine
          Provision – für dich ändert sich am Preis nichts. So bleibt Wishboxx für Familien kostenlos.
        </footer>
      </body>
    </html>
  );
}
