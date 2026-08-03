import crypto from "crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { paymentConfigs } from "@/lib/db/schema";

/**
 * Per-organizer gateway credentials.
 *
 * Secrets are encrypted at rest with AES-256-GCM. The previous implementation
 * used AES-256-CBC with no authentication tag, so a stored ciphertext could be
 * tampered with undetectably, and it derived the key by passing the raw env
 * string to Buffer.from — which silently produced a short key if the value was
 * not exactly 32 characters.
 */

const IV_LENGTH = 12;

function key(): Buffer {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) throw new Error("ENCRYPTION_KEY is not set");
  // Hashing gives a correct 32-byte key regardless of the input's length.
  return crypto.createHash("sha256").update(secret).digest();
}

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [iv.toString("hex"), tag.toString("hex"), encrypted.toString("hex")].join(
    ":"
  );
}

export function decrypt(payload: string): string {
  const [ivHex, tagHex, dataHex] = payload.split(":");
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error("Malformed ciphertext");
  }
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(ivHex, "hex")
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}

/** Show enough to recognise a key without revealing it. */
export function mask(value: string | null): string | null {
  if (!value) return null;
  if (value.length <= 8) return "•".repeat(value.length);
  return `${value.slice(0, 4)}${"•".repeat(Math.max(4, value.length - 8))}${value.slice(-4)}`;
}

export const PaymentConfigSchema = z.object({
  accountHolderName: z.string().trim().max(200).optional(),
  gateway: z.enum(["razorpay", "stripe"]),
  razorpayKeyId: z.string().trim().min(10).max(200).optional(),
  razorpayKeySecret: z.string().trim().min(10).max(200).optional(),
  stripePublishableKey: z.string().trim().min(10).max(200).optional(),
  stripeSecretKey: z.string().trim().min(10).max(200).optional(),
});

export type PaymentConfigInput = z.infer<typeof PaymentConfigSchema>;

export async function savePaymentConfig(
  userId: string,
  input: PaymentConfigInput
): Promise<void> {
  const values = {
    userId,
    accountHolderName: input.accountHolderName ?? null,
    gateway: input.gateway,
    razorpayKeyId: input.razorpayKeyId ?? null,
    razorpayKeySecretEncrypted: input.razorpayKeySecret
      ? encrypt(input.razorpayKeySecret)
      : null,
    stripePublishableKey: input.stripePublishableKey ?? null,
    stripeSecretKeyEncrypted: input.stripeSecretKey
      ? encrypt(input.stripeSecretKey)
      : null,
    updatedAt: new Date(),
  };

  await db
    .insert(paymentConfigs)
    .values(values)
    .onConflictDoUpdate({ target: paymentConfigs.userId, set: values });
}

/** Masked view for the settings screen. Secrets never leave the server. */
export async function getMaskedPaymentConfig(userId: string) {
  const [config] = await db
    .select()
    .from(paymentConfigs)
    .where(eq(paymentConfigs.userId, userId));
  if (!config) return null;

  return {
    accountHolderName: config.accountHolderName,
    gateway: config.gateway,
    razorpayKeyId: mask(config.razorpayKeyId),
    // Only whether a secret is stored, never any part of it — the previous
    // version decrypted and returned a masked form of the actual secret.
    razorpayKeySecretSet: config.razorpayKeySecretEncrypted !== null,
    stripePublishableKey: mask(config.stripePublishableKey),
    stripeSecretKeySet: config.stripeSecretKeyEncrypted !== null,
  };
}

/**
 * The Razorpay credentials a given organizer's tickets should be charged
 * against.
 *
 * Organizers can store their own keys, and until now nothing read them —
 * every checkout ran on the platform account regardless, which made the
 * settings screen a form that saved into a void and the landing page's
 * "buyers pay your account directly" untrue. Returns null when the organizer
 * has not connected an account, and the caller falls back to the platform's.
 *
 * Only ever called on the server: it decrypts the stored secret.
 */
export async function getOrganizerRazorpayCredentials(
  userId: string
): Promise<{ keyId: string; keySecret: string } | null> {
  const [config] = await db
    .select()
    .from(paymentConfigs)
    .where(eq(paymentConfigs.userId, userId));

  if (
    !config ||
    config.gateway !== "razorpay" ||
    !config.razorpayKeyId ||
    !config.razorpayKeySecretEncrypted
  ) {
    return null;
  }

  return {
    keyId: config.razorpayKeyId,
    keySecret: decrypt(config.razorpayKeySecretEncrypted),
  };
}
