"use client";
import { useActionState } from "react";
import { SubmitButton } from "./SubmitButton";

type Action = (state: unknown, fd: FormData) => Promise<{ error?: string } | undefined>;

export function AuthForm({ action, mode, next }: { action: Action; mode: "login" | "register"; next?: string }) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className="card mx-auto max-w-md space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <h1 className="text-2xl">{mode === "login" ? "Willkommen zurück" : "Konto erstellen"}</h1>
      {mode === "register" && (
        <div>
          <label className="label" htmlFor="name">Dein Name</label>
          <input className="input" id="name" name="name" required autoComplete="name" />
        </div>
      )}
      <div>
        <label className="label" htmlFor="email">E-Mail</label>
        <input className="input" id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div>
        <label className="label" htmlFor="password">Passwort {mode === "register" && "(mind. 8 Zeichen)"}</label>
        <input
          className="input"
          id="password"
          name="password"
          type="password"
          required
          minLength={mode === "register" ? 8 : undefined}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
      </div>
      {state?.error && <p className="text-sm font-bold text-red-600">{state.error}</p>}
      <SubmitButton>{mode === "login" ? "Anmelden" : "Registrieren"}</SubmitButton>
    </form>
  );
}
