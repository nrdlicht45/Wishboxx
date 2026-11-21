import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { register } from "../actions";

export default function RegisterPage() {
  return (
    <div className="space-y-4">
      <AuthForm action={register} mode="register" />
      <p className="muted text-center text-sm">
        Schon registriert? <Link className="underline" href="/login">Anmelden</Link>
      </p>
      <p className="muted mx-auto max-w-md text-center text-xs">
        Nur du brauchst ein Konto. Gäste reservieren ohne Registrierung.
      </p>
    </div>
  );
}
