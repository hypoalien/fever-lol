// app/api/payment-config/route.ts
import { auth } from "@/auth";
import { db } from "@/lib/mongo";
import { ObjectId } from "mongodb";
import crypto from "crypto";

// Encryption configuration
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || ""; // Must be 32 characters
const IV_LENGTH = 16;

// Utility functions for encryption/decryption
function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY),
    iv
  );
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

function decrypt(text: string): string {
  const [ivHex, encryptedHex] = text.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY),
    iv
  );
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

function maskApiKey(key: string): string {
  if (!key) return "";
  if (key.length <= 8) return key;
  return `${key.slice(0, 4)}${"X".repeat(key.length - 8)}${key.slice(-4)}`;
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return new Response("Unauthorized", { status: 403 });
    }

    const userId = session.user?.id;
    if (!userId || typeof userId !== "string") {
      return new Response("Invalid UserId", { status: 400 });
    }

    const body = await req.json();
    const {
      accountHolderName,
      paymentGateway,
      razorpayKeyId,
      razorpayKeySecret,
      stripePublishableKey,
      stripeSecretKey,
    } = body;

    const client = await db;
    const collection = client.db().collection("payment_configs");

    // Encrypt sensitive data
    const encryptedData = {
      accountHolderName,
      paymentGateway,
      razorpayKeyId: razorpayKeyId ? encrypt(razorpayKeyId) : null,
      razorpayKeySecret: razorpayKeySecret ? encrypt(razorpayKeySecret) : null,
      stripePublishableKey: stripePublishableKey
        ? encrypt(stripePublishableKey)
        : null,
      stripeSecretKey: stripeSecretKey ? encrypt(stripeSecretKey) : null,
      updatedAt: new Date(),
    };

    await collection.updateOne(
      { userId: new ObjectId(userId) },
      { $set: encryptedData },
      { upsert: true }
    );

    return Response.json({
      message: "Payment configuration updated successfully",
    });
  } catch (error) {
    console.error("Error updating payment configuration:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return new Response("Unauthorized", { status: 403 });
    }

    const userId = session.user?.id;
    if (!userId || typeof userId !== "string") {
      return new Response("Invalid UserId", { status: 400 });
    }

    const client = await db;
    const collection = client.db().collection("payment_configs");

    const config = await collection.findOne(
      { userId: new ObjectId(userId) },
      {
        projection: {
          accountHolderName: 1,
          paymentGateway: 1,
          razorpayKeyId: 1,
          razorpayKeySecret: 1,
          stripePublishableKey: 1,
          stripeSecretKey: 1,
        },
      }
    );

    if (!config) {
      return Response.json({});
    }

    // Decrypt and mask sensitive data
    const maskedConfig = {
      ...config,
      razorpayKeyId: config.razorpayKeyId
        ? maskApiKey(decrypt(config.razorpayKeyId))
        : null,
      razorpayKeySecret: config.razorpayKeySecret
        ? maskApiKey(decrypt(config.razorpayKeySecret))
        : null,
      stripePublishableKey: config.stripePublishableKey
        ? maskApiKey(decrypt(config.stripePublishableKey))
        : null,
      stripeSecretKey: config.stripeSecretKey
        ? maskApiKey(decrypt(config.stripeSecretKey))
        : null,
    };

    return Response.json(maskedConfig);
  } catch (error) {
    console.error("Error fetching payment configuration:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
