"use client";

import { createAuthClient } from "better-auth/react";
import { magicLinkClient } from "better-auth/client/plugins";
import { inferAdditionalFields } from "better-auth/client/plugins";

import type { Auth } from "@/lib/auth";

/**
 * Browser-side auth client.
 *
 * `inferAdditionalFields` carries the custom user columns (currency, orgName,
 * …) through to `useSession()` with real types, so reading them no longer
 * needs a cast or a module augmentation.
 */
export const authClient = createAuthClient({
  plugins: [magicLinkClient(), inferAdditionalFields<Auth>()],
});

export const { signIn, signOut, useSession, getSession } = authClient;

export type SessionUser = typeof authClient.$Infer.Session.user;
