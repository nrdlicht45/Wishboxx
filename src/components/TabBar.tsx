"use client";
import { Icon } from "./Icon";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** App-typische Navigation unten – nur auf dem Handy, nur für angemeldete Eltern. */
export function TabBar({ isAdmin, logoutAction }: { isAdmin: boolean; logoutAction: () => Promise<void> }) {
  const path = usePathname();
  const tabs = [
    { href: "/dashboard", icon: "home", label: "Meine Boxx", active: path === "/dashboard" || (path.startsWith("/lists/") && path !== "/lists/new") },
    { href: "/start", icon: "plus", label: "Neue Boxx", active: path === "/start" || path === "/lists/new" },
    { href: "/recipients/new", icon: "users", label: "Familie", active: path.startsWith("/recipients") },
    ...(isAdmin ? [{ href: "/admin", icon: "settings", label: "Admin", active: path.startsWith("/admin") }] : []),
  ];
  const style = (active: boolean) => ({ color: active ? "var(--violet)" : "var(--muted)" });
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 sm:hidden"
      style={{
        background: "color-mix(in srgb, var(--card) 88%, transparent)",
        backdropFilter: "blur(12px)",
        boxShadow: "0 -4px 20px rgba(120,80,170,.08)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      aria-label="Hauptnavigation"
    >
      <ul className="flex justify-around">
        {tabs.map((t) => (
          <li key={t.href} className="flex-1">
            <Link href={t.href} aria-current={t.active ? "page" : undefined}
              className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold" style={style(t.active)}>
              <Icon name={t.icon} size={22} />
              {t.label}
            </Link>
          </li>
        ))}
        <li className="flex-1">
          <form action={logoutAction}>
            <button type="submit" className="flex min-h-14 w-full flex-col items-center justify-center gap-0.5 text-[11px] font-semibold" style={style(false)}>
              <Icon name="logout" size={22} />
              Abmelden
            </button>
          </form>
        </li>
      </ul>
    </nav>
  );
}
