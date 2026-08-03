import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins";

import { db } from "@/lib/db";
import {
  accounts,
  sessions,
  users,
  verifications,
} from "@/lib/db/schema";
import { sendMagicLinkEmail } from "@/lib/email/magic-link";

/**
 * Authentication.
 *
 * Replaces the previous NextAuth v5 beta setup. Two things it fixes beyond the
 * swap itself: the magic-link path no longer needs an SMTP transport it never
 * used (it always sent through Resend), and the session no longer carries a
 * hand-rolled JWT callback that re-queried the user on every request.
 */

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

/** Google sign-in is optional locally — magic links are enough to develop with. */
const googleCredentials =
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
    ? {
        clientId: process.env.AUTH_GOOGLE_ID,
        clientSecret: process.env.AUTH_GOOGLE_SECRET,
      }
    : null;

export const auth = betterAuth({
  // Left undefined in development so Better Auth infers the origin from the
  // request. Pulling production env down locally otherwise makes every magic
  // link point at the live site.
  baseURL:
    process.env.BETTER_AUTH_URL ??
    (process.env.NODE_ENV === "production"
      ? process.env.NEXTAUTH_URL
      : undefined),
  secret: process.env.BETTER_AUTH_SECRET ?? requiredEnv("NEXTAUTH_SECRET"),

  database: drizzleAdapter(db, {
    provider: "pg",
    // Our tables are plural and carry extra domain columns, so they are mapped
    // explicitly rather than relying on Better Auth's default naming.
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
    },
  }),

  advanced: {
    database: {
      // The user table's primary key is a uuid column, not free-form text.
      generateId: () => crypto.randomUUID(),
    },
  },

  user: {
    additionalFields: {
      firstName: { type: "string", required: false, input: true },
      lastName: { type: "string", required: false, input: true },
      orgName: { type: "string", required: false, input: true },
      orgUrl: { type: "string", required: false, input: true },
      currency: { type: "string", required: false, input: true },
      // Set by the onboarding endpoint, never by the client.
      onboardedAt: { type: "date", required: false, input: false },
    },
  },

  rateLimit: {
    enabled: true,
    // Better Auth applies a stricter per-path rule to the sign-in endpoints —
    // five magic links per window — which is right for production and is why
    // this is left alone there. The end-to-end suite signs in more often than
    // that from one address, so the rule is relaxed for it specifically.
    ...(process.env.E2E === "1"
      ? {
          customRules: {
            "/sign-in/magic-link": { window: 10, max: 1000 },
            "/magic-link/verify": { window: 10, max: 1000 },
            "/sign-out": { window: 10, max: 1000 },
          },
        }
      : {}),
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      // Avoids a database read on every request for the common case.
      enabled: true,
      maxAge: 5 * 60,
    },
  },

  socialProviders: googleCredentials ? { google: googleCredentials } : {},

  plugins: [
    magicLink({
      expiresIn: 60 * 10,
      // Stored hashed, so a leaked database row is not a usable sign-in link.
      storeToken: "hashed",
      sendMagicLink: async ({ email, url }) => {
        await sendMagicLinkEmail({ to: email, url });
      },
    }),
    // Must be last: lets server actions and route handlers set cookies.
    nextCookies(),
  ],
});

export type Auth = typeof auth;
