"use client";
import { useEffect, useState } from "react";
import { removePushSubscription, savePushSubscription } from "@/app/actions";
import { Icon } from "./Icon";

const toKey = (b64: string) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

/** Push-Nachrichten für die Boxx-Inhaberin ein-/ausschalten. */
export function PushToggle({ publicKey }: { publicKey: string }) {
  const [state, setState] = useState<"loading" | "unsupported" | "ios-install" | "off" | "on" | "denied">("loading");

  useEffect(() => {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setState(ios && !standalone ? "ios-install" : "unsupported");
      return;
    }
    if (Notification.permission === "denied") return setState("denied");
    navigator.serviceWorker.getRegistration().then(async (reg) => {
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      setState(sub ? "on" : "off");
    });
  }, []);

  const enable = async () => {
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setState(perm === "denied" ? "denied" : "off");
      const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(publicKey) });
      await savePushSubscription(sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } });
      setState("on");
    } catch {
      setState("unsupported");
    }
  };
  const disable = async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await removePushSubscription(sub.endpoint);
      await sub.unsubscribe();
    }
    setState("off");
  };

  if (state === "loading" || state === "unsupported") return null;
  return (
    <div className="card flex flex-wrap items-center gap-3">
      <span className="ic-bubble" style={{ width: 44, height: 44 }}><Icon name="bell" /></span>
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold">{state === "on" ? "Benachrichtigungen sind an" : "Nichts verpassen"}</p>
        <p className="muted">
          {state === "ios-install"
            ? "Auf dem iPhone gehen Benachrichtigungen, sobald Wishboxx auf dem Home-Bildschirm ist (Teilen → „Zum Home-Bildschirm“)."
            : state === "denied"
              ? "Benachrichtigungen sind in den Browser-Einstellungen blockiert."
              : "Bei neuen Reservierungen und Zusagen – und eine Erinnerung vor dem Fest, was noch offen ist."}
        </p>
      </div>
      {state === "off" && <button type="button" className="btn" onClick={enable}>Einschalten</button>}
      {state === "on" && <button type="button" className="btn-ghost" onClick={disable}>Ausschalten</button>}
    </div>
  );
}
