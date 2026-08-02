import { Resend } from "resend";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

import magicLinkTemplate from "./magic-link-email";

/**
 * Magic-link delivery.
 *
 * Previously this ran through NextAuth's nodemailer provider, which required
 * SMTP settings that were configured but never actually used — the provider's
 * sendVerificationRequest bypassed the transport and called Resend directly.
 * Only Resend is involved now.
 */

let client: Resend | null = null;

function resend(): Resend | null {
  const key = process.env.AUTH_RESEND_KEY ?? process.env.EMAIL_SERVER_PASSWORD;
  if (!key) return null;
  client ??= new Resend(key);
  return client;
}

const DEFAULT_FROM = "Fever.lol <onboarding@fever.lol>";

/**
 * Resend requires `email@example.com` or `Name <email@example.com>`.
 *
 * Production currently has EMAIL_FROM set to a bare domain, which Resend
 * rejects with a 422 — and because the old code swallowed send failures, every
 * magic-link request appeared to succeed while no email was ever delivered.
 * A malformed value now falls back to a valid sender and says so.
 */
function senderAddress(): string {
  const configured = process.env.EMAIL_FROM?.trim();
  if (!configured) return DEFAULT_FROM;

  const looksValid =
    /^[^<>@\s]+@[^<>@\s]+\.[^<>@\s]+$/.test(configured) ||
    /^.+<[^<>@\s]+@[^<>@\s]+\.[^<>@\s]+>$/.test(configured);

  if (!looksValid) {
    console.warn(
      `EMAIL_FROM is not a valid sender address (${configured}); using ${DEFAULT_FROM}`
    );
    return DEFAULT_FROM;
  }
  return configured;
}

/** Returning users get "sign in"; brand new addresses get "activate". */
async function isReturningUser(email: string): Promise<boolean> {
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = lower(${email})`)
    .limit(1);
  return existing !== undefined;
}

export async function sendMagicLinkEmail({
  to,
  url,
}: {
  to: string;
  url: string;
}): Promise<void> {
  const action = (await isReturningUser(to)) ? "SIGNIN" : "ACTIVATE";
  const mailer = resend();

  // Outside production, print the link instead of sending it. Developers pull
  // production credentials down with `vercel env pull`, and without this every
  // local sign-in would spend real send quota — or fail on a sending domain
  // that is only verified for production. Set EMAIL_SEND_IN_DEV=1 to override.
  const deliver =
    process.env.NODE_ENV === "production" || process.env.EMAIL_SEND_IN_DEV === "1";

  if (!deliver || !mailer) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`\n  Magic link for ${to}:\n  ${url}\n`);
      return;
    }
    throw new Error("Email is not configured: set AUTH_RESEND_KEY");
  }

  const { error } = await mailer.emails.send({
    from: senderAddress(),
    to: [to],
    subject:
      action === "SIGNIN" ? "Sign in to Fever.lol" : "Activate your account",
    html: magicLinkTemplate(url, action),
  });

  if (error) {
    // Surface the failure — the previous implementation logged and returned,
    // so the caller believed an email had been sent when it had not.
    throw new Error(`Could not send magic link: ${error.message}`);
  }
}
