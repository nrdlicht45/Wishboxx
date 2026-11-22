import { redirect } from "next/navigation";

/** Registrierung läuft über den Schnellstart bzw. den E-Mail-Link. */
export default function RegisterPage() {
  redirect("/start");
}
