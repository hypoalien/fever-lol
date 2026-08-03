import { headers } from "next/headers";

import { auth } from "@/lib/auth";

/**
 * Server-side session access.
 *
 * `getCurrentUser` returns null both when there is no session and when the
 * session lacks an id, so callers have one thing to check rather than the
 * two-step `if (!session)` then `if (!userId || typeof userId !== "string")`
 * dance that was repeated in every route handler.
 */

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  image: string | null;
  currency: string | null;
  orgName: string | null;
  orgUrl: string | null;
  onboarded: boolean;
};

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getSession();
  const user = session?.user;
  if (!user?.id) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image ?? null,
    currency: user.currency ?? null,
    orgName: user.orgName ?? null,
    orgUrl: user.orgUrl ?? null,
    onboarded: user.onboardedAt != null,
  };
}

/**
 * For route handlers: either the user, or the 401 response to return.
 *
 * Lets a handler open with
 *   `const session = await requireUser();`
 *   `if (!session.ok) return session.response;`
 * instead of hand-rolling the unauthorised branch each time.
 */
export type AuthResult =
  | { ok: true; user: CurrentUser }
  | { ok: false; response: Response };

export async function requireUser(): Promise<AuthResult> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      // 401 is the correct code here; the previous handlers returned 403,
      // which means "authenticated but not permitted".
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true, user };
}
