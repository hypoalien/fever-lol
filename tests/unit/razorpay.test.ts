import crypto from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";

import {
  getPlatformCredentials,
  isRazorpayConfigured,
  verifyPaymentSignature,
} from "@/lib/razorpay";

const SECRET = "test_secret_key";

function sign(orderId: string, paymentId: string, secret = SECRET): string {
  return crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
}

describe("verifyPaymentSignature", () => {
  const orderId = "order_ABC123";
  const paymentId = "pay_XYZ789";

  it("accepts a signature produced with the same secret", () => {
    expect(
      verifyPaymentSignature(
        { razorpayOrderId: orderId, razorpayPaymentId: paymentId, signature: sign(orderId, paymentId) },
        SECRET
      )
    ).toBe(true);
  });

  it("rejects a signature minted with a different secret", () => {
    expect(
      verifyPaymentSignature(
        {
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          signature: sign(orderId, paymentId, "attacker_secret"),
        },
        SECRET
      )
    ).toBe(false);
  });

  it("rejects a signature bound to a different order or payment", () => {
    const valid = sign(orderId, paymentId);
    expect(
      verifyPaymentSignature(
        { razorpayOrderId: "order_OTHER", razorpayPaymentId: paymentId, signature: valid },
        SECRET
      )
    ).toBe(false);
    expect(
      verifyPaymentSignature(
        { razorpayOrderId: orderId, razorpayPaymentId: "pay_OTHER", signature: valid },
        SECRET
      )
    ).toBe(false);
  });

  it("rejects junk without throwing", () => {
    for (const signature of ["", "zzzz", "deadbeef", "not hex at all"]) {
      expect(
        verifyPaymentSignature(
          { razorpayOrderId: orderId, razorpayPaymentId: paymentId, signature },
          SECRET
        )
      ).toBe(false);
    }
  });

  it("rejects non-string inputs", () => {
    expect(
      verifyPaymentSignature(
        {
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          signature: undefined as unknown as string,
        },
        SECRET
      )
    ).toBe(false);
  });

  it("rejects a truncated signature rather than comparing prefixes", () => {
    const valid = sign(orderId, paymentId);
    expect(
      verifyPaymentSignature(
        { razorpayOrderId: orderId, razorpayPaymentId: paymentId, signature: valid.slice(0, 32) },
        SECRET
      )
    ).toBe(false);
  });
});

describe("credential resolution", () => {
  beforeEach(() => {
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;
    delete process.env.TEST_RAZORPAY_KEY_ID;
    delete process.env.TEST_RAZORPAY_KEY_SECRET;
  });

  it("reports unconfigured instead of throwing at import time", () => {
    expect(isRazorpayConfigured()).toBe(false);
    expect(() => getPlatformCredentials()).toThrow(/not configured/);
  });

  it("falls back to the TEST_-prefixed names production currently uses", () => {
    process.env.TEST_RAZORPAY_KEY_ID = "rzp_test_id";
    process.env.TEST_RAZORPAY_KEY_SECRET = "rzp_test_secret";
    expect(getPlatformCredentials()).toEqual({
      keyId: "rzp_test_id",
      keySecret: "rzp_test_secret",
    });
  });

  it("prefers the unprefixed names when both are present", () => {
    process.env.TEST_RAZORPAY_KEY_ID = "test_id";
    process.env.TEST_RAZORPAY_KEY_SECRET = "test_secret";
    process.env.RAZORPAY_KEY_ID = "live_id";
    process.env.RAZORPAY_KEY_SECRET = "live_secret";
    expect(getPlatformCredentials().keyId).toBe("live_id");
  });
});
