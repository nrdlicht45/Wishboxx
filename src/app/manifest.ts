import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Wishboxx – Alle Wünsche. Alle Feste.",
    short_name: "Wishboxx",
    description: "Wunschlisten für Kinder & Familien: KI-Ideen, Reservieren ohne Account, Gruppengeschenke.",
    id: "/",
    start_url: "/dashboard?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f1ebff",
    theme_color: "#a86bff",
    lang: "de",
    categories: ["lifestyle", "shopping", "kids"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Boxx packen", url: "/start", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Meine Boxx", url: "/dashboard", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
    // Android: Wishboxx erscheint im „Teilen“-Menü anderer Apps (z.B. Amazon, Shop-Apps, Browser)
    share_target: {
      action: "/share",
      method: "GET",
      params: { title: "title", text: "text", url: "url" },
    },
  } as MetadataRoute.Manifest;
}
