import crypto from "crypto";
import Razorpay from "razorpay";

/**
 * Razorpay access.
 *
 * The client is created lazily. It used to be constructed at module scope,
 * which meant `next build` crashed with "key_id is mandatory" whenever the
 * route was statically analysed without credentials present.
 */

export interface RazorpayCredentials {
  keyId: string;
  keySecret: string;
}

/**
 * Platform-level credentials. `TEST_`-prefixed names are what production is
 * currently configured with; the unprefixed names are preferred going forward.
 */
export function getPlatformCredentials(): RazorpayCredentials {
  const keyId = process.env.RAZORPAY_KEY_ID ?? process.env.TEST_RAZORPAY_KEY_ID;
  const keySecret =
    process.env.RAZORPAY_KEY_SECRET ?? process.env.TEST_RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error(
      "Razorpay is not configured: set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET"
    );
  }
  return { keyId, keySecret };
}

export function isRazorpayConfigured(): boolean {
  try {
    getPlatformCredentials();
    return true;
  } catch {
    return false;
  }
}

let cached: { keyId: string; client: Razorpay } | null = null;

export function getRazorpayClient(creds?: RazorpayCredentials): Razorpay {
  const { keyId, keySecret } = creds ?? getPlatformCredentials();
  if (cached?.keyId === keyId) return cached.client;

  const client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  cached = { keyId, client };
  return client;
}

/**
 * Verify a Razorpay payment signature.
 *
 * Uses a constant-time comparison so the endpoint doesn't leak the expected
 * digest byte-by-byte through response timing.
 */
export function verifyPaymentSignature(
  params: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    signature: string;
  },
  keySecret?: string
): boolean {
  const secret = keySecret ?? getPlatformCredentials().keySecret;
  const { razorpayOrderId, razorpayPaymentId, signature } = params;

  if (
    typeof razorpayOrderId !== "string" ||
    typeof razorpayPaymentId !== "string" ||
    typeof signature !== "string"
  ) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest();

  let provided: Buffer;
  try {
    provided = Buffer.from(signature, "hex");
  } catch {
    return false;
  }

  // timingSafeEqual throws on a length mismatch, so check that first.
  if (provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(provided, expected);
}
