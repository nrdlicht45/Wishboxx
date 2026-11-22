"use client";
import { useActionState } from "react";
import { requestLoginLink, type LinkState } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";
import { Icon } from "./Icon";

/** E-Mail eingeben → Login-Link kommt per Mail. Kein Passwort. */
export function LoginLinkForm({ next, withName = false, cta = "Link senden" }: { next?: string; withName?: boolean; cta?: string }) {
  const [state, action] = useActionState<LinkState | undefined, FormData>(requestLoginLink, undefined);
  if (state?.sent) {
    return (
      <div className="space-y-3 text-center">
        <span className="ic-bubble mx-auto" style={{ width: 56, height: 56 }}><Icon name="mail" size={26} /></span>
        <p className="display text-xl">Schau in dein Postfach</p>
        <p className="muted text-sm">Wir haben einen Anmelde-Link an <strong>{state.email}</strong> geschickt. Einfach antippen – fertig.</p>
        {state.devLink && (
          <p className="text-xs">
            Entwicklungsmodus (kein E-Mail-Versand eingerichtet): <a className="underline" href={state.devLink}>Link öffnen</a>
          </p>
        )}
      </div>
    );
  }
  return (
    <form action={action} className="space-y-3">
      {next && <input type="hidden" name="next" value={next} />}
      {withName && (
        <div>
          <label className="label" htmlFor="ll-name">Dein Vorname</label>
          <input className="input" id="ll-name" name="name" autoComplete="given-name" />
        </div>
      )}
      <div>
        <label className="label" htmlFor="ll-email">E-Mail</label>
        <input className="input" id="ll-email" name="email" type="email" required autoComplete="email" inputMode="email" placeholder="du@beispiel.de" />
      </div>
      {state?.error && <p className="text-sm font-semibold" style={{ color: "var(--pink-ink)" }}>{state.error}</p>}
      <SubmitButton className="btn w-full">{cta}</SubmitButton>
    </form>
  );
}
