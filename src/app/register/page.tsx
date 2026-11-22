import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { register } from "../actions";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="space-y-4">
      <AuthForm action={register} mode="register" next={next} />
      <p className="muted text-center text-sm">
        Schon registriert? <Link className="underline" href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}>Anmelden</Link>
      </p>
      <p className="muted mx-auto max-w-md text-center text-xs">
        Nur du brauchst ein Konto. Gäste reservieren ohne Registrierung.
      </p>
    </div>
  );
}
