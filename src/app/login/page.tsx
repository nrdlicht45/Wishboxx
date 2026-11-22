import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { LoginLinkForm } from "@/components/LoginLinkForm";
import { login } from "../actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; abgelaufen?: string }> }) {
  const { next, abgelaufen } = await searchParams;
  return (
    <div className="mx-auto max-w-md space-y-5">
      <div className="card space-y-4">
        <h1 className="text-3xl">Willkommen <span className="g">zurück</span></h1>
        <p className="muted text-sm">Kein Passwort nötig – wir schicken dir einen Anmelde-Link.</p>
        {abgelaufen && <p className="chip chip-pink">Der Link ist abgelaufen oder wurde schon benutzt. Hol dir einfach einen neuen.</p>}
        <LoginLinkForm next={next} />
      </div>
      <p className="muted text-center text-sm">
        Neu hier? <Link className="underline" href="/start">Erste Boxx packen – ohne Anmeldung</Link>
      </p>
      <details className="text-sm">
        <summary className="muted cursor-pointer text-center">Mit Passwort anmelden</summary>
        <div className="mt-3"><AuthForm action={login} mode="login" next={next} /></div>
      </details>
    </div>
  );
}
