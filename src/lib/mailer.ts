import nodemailer, { type Transporter } from "nodemailer";

/**
 * E-Mail-Versand per SMTP (z.B. Brevo, Mailjet, Postmark, Gmail).
 * Ohne SMTP_HOST werden Mails nur ins Server-Log geschrieben (Entwicklung).
 */
let transport: Transporter | null = null;

export function mailConfigured(): boolean {
  return !!process.env.SMTP_HOST;
}

export async function sendMail(to: string, subject: string, text: string): Promise<boolean> {
  if (!mailConfigured()) {
    console.log(`[mail:dev] an ${to}: ${subject}\n${text}`);
    return true;
  }
  transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  try {
    await transport.sendMail({ from: process.env.MAIL_FROM || "Wishboxx <noreply@wishboxx.app>", to, subject, text });
    return true;
  } catch (err) {
    console.error("Mailversand fehlgeschlagen", err);
    return false;
  }
}
