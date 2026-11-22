"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** App-typische Navigation unten – nur auf dem Handy, nur für angemeldete Eltern. */
export function TabBar({ isAdmin, logoutAction }: { isAdmin: boolean; logoutAction: () => Promise<void> }) {
  const path = usePathname();
  const tabs = [
    { href: "/dashboard", icon: "📦", label: "Kisten", active: path === "/dashboard" || path.startsWith("/lists/") && path !== "/lists/new" },
    { href: "/lists/new", icon: "➕", label: "Neu", active: path === "/lists/new" },
    { href: "/recipients/new", icon: "🧒", label: "Kinder", active: path.startsWith("/recipients") },
    ...(isAdmin ? [{ href: "/admin", icon: "⚙️", label: "Admin", active: path.startsWith("/admin") }] : []),
  ];
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 border-t sm:hidden"
      style={{ background: "var(--card)", borderColor: "var(--line)", paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Hauptnavigation"
    >
      <ul className="flex justify-around">
        {tabs.map((t) => (
          <li key={t.href} className="flex-1">
            <Link
              href={t.href}
              aria-current={t.active ? "page" : undefined}
              className="flex flex-col items-center py-2 text-xs font-bold"
              style={{ color: t.active ? "var(--color-brand-600)" : "var(--muted)" }}
            >
              <span className="text-xl" aria-hidden>{t.icon}</span>
              {t.label}
            </Link>
          </li>
        ))}
        <li className="flex-1">
          <form action={logoutAction}>
            <button type="submit" className="flex w-full flex-col items-center py-2 text-xs font-bold" style={{ color: "var(--muted)" }}>
              <span className="text-xl" aria-hidden>👋</span>
              Abmelden
            </button>
          </form>
        </li>
      </ul>
    </nav>
  );
}
