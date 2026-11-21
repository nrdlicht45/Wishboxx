import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { login } from "../actions";

export default function LoginPage() {
  return (
    <div className="space-y-4">
      <AuthForm action={login} mode="login" />
      <p className="muted text-center text-sm">
        Noch kein Konto? <Link className="underline" href="/register">Jetzt registrieren</Link>
      </p>
    </div>
  );
}
