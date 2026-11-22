"use client";
import { Icon } from "./Icon";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const KEY = "wb_install_dismissed";

/** Hinweis „Wishboxx als App installieren“ – Android per Knopf, iPhone mit Anleitung. */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(KEY) === "1";
    } catch {}
    if (standalone || dismissed) return;
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIos(isIos);
    if (isIos) setHidden(false);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setHidden(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (hidden) return null;
  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
  };

  return (
    <div className="card flex items-start gap-3" role="region" aria-label="App installieren">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/icon-192.png" alt="" className="h-12 w-12 rounded-xl" />
      <div className="flex-1 text-sm">
        <p className="font-bold">Wishboxx als App aufs Handy</p>
        {ios ? (
          <p className="muted">
            Tippe unten in Safari auf <strong>Teilen</strong> <Icon name="upload" size={15} className="inline align-[-2px]" /> und dann auf{" "}
            <strong>„Zum Home-Bildschirm“</strong>.
          </p>
        ) : (
          <p className="muted">Mit Icon auf dem Startbildschirm – und „Teilen → Wishboxx“ direkt aus Shop-Apps.</p>
        )}
        <div className="mt-2 flex gap-2">
          {deferred && (
            <button
              type="button"
              className="btn"
              onClick={async () => {
                await deferred.prompt();
                await deferred.userChoice;
                setDeferred(null);
                setHidden(true);
              }}
            >
              Installieren
            </button>
          )}
          <button type="button" className="btn-ghost" onClick={dismiss}>Später</button>
        </div>
      </div>
    </div>
  );
}
