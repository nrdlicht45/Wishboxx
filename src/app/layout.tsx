import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "./actions";
import { PwaRegister } from "@/components/PwaRegister";
import { TabBar } from "@/components/TabBar";

export const metadata: Metadata = {
  title: "Wishboxx – die digitale Geburtstagskiste",
  description:
    "Wunschlisten für Kinder & Familien: KI-Geschenkideen, Reservieren ohne Account, Gruppengeschenke und Danke-Liste.",
  applicationName: "Wishboxx",
  appleWebApp: { capable: true, title: "Wishboxx", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#a86bff",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <html lang="de">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Comfortaa:wght@600;700&family=Outfit:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased">
        <PwaRegister />
        <header className="px-3 pt-3">
          <nav
            className="mx-auto flex max-w-5xl items-center justify-between gap-3 rounded-full px-4 py-2"
            style={{ background: "color-mix(in srgb, var(--card) 75%, transparent)", boxShadow: "var(--shadow)" }}
          >
            <Link href={user ? "/dashboard" : "/"} className="display flex items-center gap-2 text-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/icon.svg" alt="" width={30} height={30} className="rounded-xl" />
              <span><span className="g">W</span>ishboxx</span>
            </Link>
            <div className={`items-center gap-2 text-sm ${user ? "hidden sm:flex" : "flex"}`}>
              {user ? (
                <>
                  <Link href="/dashboard" className="btn-ghost">Übersicht</Link>
                  {user.is_admin ? <Link href="/admin" className="btn-ghost">Admin</Link> : null}
                  <form action={logout}>
                    <button className="btn-ghost" type="submit">Abmelden</button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login" className="btn-ghost hidden sm:inline-flex">Anmelden</Link>
                  <Link href="/register" className="btn whitespace-nowrap">Starten</Link>
                </>
              )}
            </div>
          </nav>
        </header>
        <main className={`mx-auto max-w-5xl px-4 py-8 ${user ? "pb-28 sm:pb-6" : ""}`}>{children}</main>
        {user && <TabBar isAdmin={!!user.is_admin} logoutAction={logout} />}
        <footer className="mx-auto max-w-5xl px-4 pb-10 pt-6 text-xs muted">
          * Mit Sternchen markierte Links sind Affiliate-Links. Kaufst du darüber ein, erhält Wishboxx eine kleine
          Provision – für dich ändert sich am Preis nichts. So bleibt Wishboxx für Familien kostenlos.
        </footer>
      </body>
    </html>
  );
}
