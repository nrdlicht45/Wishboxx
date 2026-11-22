import type { Metadata } from "next";
import { SubmitButton } from "@/components/SubmitButton";
import { confirmLogin } from "@/app/actions";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Bestätigungsseite statt direkter Anmeldung per GET: Manche Mail-Programme rufen
 * Links vorab auf (Link-Vorschau, Virenscanner) – das würde den Einmal-Link sonst verbrauchen.
 */
export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <form action={confirmLogin} className="card mx-auto max-w-md space-y-4 text-center">
      <input type="hidden" name="token" value={token ?? ""} />
      <h1 className="text-3xl">Schön, dass du <span className="g">da bist</span>.</h1>
      <p className="muted">Tippe auf den Button, um dich anzumelden.</p>
      <SubmitButton className="btn w-full text-lg">Jetzt anmelden</SubmitButton>
    </form>
  );
}
