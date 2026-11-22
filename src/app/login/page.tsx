import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { login } from "../actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="space-y-4">
      <AuthForm action={login} mode="login" next={next} />
      <p className="muted text-center text-sm">
        Noch kein Konto? <Link className="underline" href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"}>Jetzt registrieren</Link>
      </p>
    </div>
  );
}
