import "server-only";
import nodemailer from "nodemailer";

/**
 * Transactional email over Hostinger SMTP (smtp.hostinger.com:465).
 * Configure SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASSWORD/SMTP_FROM in the
 * environment. When they are absent, sending is skipped and the message is
 * logged instead so local development still works without credentials.
 */

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) return null;

  if (!transporter) {
    const port = Number(process.env.SMTP_PORT ?? 465);
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  return transporter;
}

export async function sendMail(input: { to: string; subject: string; html: string; text: string }) {
  const mailer = getTransporter();
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;

  if (!mailer || !from) {
    console.warn("[mailer] SMTP is not configured; skipping email to", input.to);
    return { sent: false as const };
  }

  try {
    await mailer.sendMail({ from, to: input.to, subject: input.subject, html: input.html, text: input.text });
    return { sent: true as const };
  } catch (error) {
    console.error("[mailer] failed to send email", error);
    return { sent: false as const };
  }
}

export function buildPasswordResetEmail(resetUrl: string) {
  return {
    subject: "Reset your JobPulse India password",
    text: `Reset your password using this link (valid for 1 hour): ${resetUrl}\n\nIf you didn't request this, you can ignore this email.`,
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0f172a">
        <h1 style="font-size:20px;margin:0 0 16px">Reset your password</h1>
        <p style="font-size:15px;line-height:1.6;color:#475569">
          We received a request to reset your JobPulse India password. This link is valid for one hour.
        </p>
        <p style="margin:24px 0">
          <a href="${resetUrl}" style="background:#e11d64;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;display:inline-block">
            Reset password
          </a>
        </p>
        <p style="font-size:13px;line-height:1.6;color:#64748b">
          If you didn't request this, you can safely ignore this email. Your password will stay unchanged.
        </p>
      </div>
    `,
  };
}
