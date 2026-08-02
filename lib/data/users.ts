import { and, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { SUPPORTED_CURRENCIES } from "@/lib/money";

/** Profile fields an organizer may set about themselves. */
export const ProfileInputSchema = z.object({
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
  orgName: z.string().trim().max(200).optional(),
  orgUrl: z
    .string()
    .trim()
    .toLowerCase()
    .min(1)
    .max(100)
    // Becomes a public URL segment, so keep it to a safe alphabet.
    .regex(
      /^[a-z0-9][a-z0-9-]*$/,
      "Use lowercase letters, numbers and hyphens only"
    )
    .optional(),
  currency: z.enum(SUPPORTED_CURRENCIES as [string, ...string[]]).optional(),
});

export type ProfileInput = z.infer<typeof ProfileInputSchema>;

/**
 * Only these fields ever reach the client. The onboarding endpoint previously
 * returned the entire user row.
 */
export interface ProfileView {
  id: string;
  email: string;
  name: string;
  image: string | null;
  firstName: string | null;
  lastName: string | null;
  orgName: string | null;
  orgUrl: string | null;
  currency: string | null;
  onboarded: boolean;
}

export async function getProfile(userId: string): Promise<ProfileView | null> {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      image: users.image,
      firstName: users.firstName,
      lastName: users.lastName,
      orgName: users.orgName,
      orgUrl: users.orgUrl,
      currency: users.currency,
      onboardedAt: users.onboardedAt,
    })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) return null;
  const { onboardedAt, ...rest } = user;
  return { ...rest, onboarded: onboardedAt != null };
}

/** True when the slug is free, or already belongs to this user. */
export async function isOrgUrlAvailable(
  orgUrl: string,
  userId: string
): Promise<boolean> {
  const [taken] = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        sql`lower(${users.orgUrl}) = lower(${orgUrl})`,
        ne(users.id, userId)
      )
    )
    .limit(1);
  return taken === undefined;
}

export class ProfileError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "ProfileError";
    this.status = status;
  }
}

export async function updateProfile(
  userId: string,
  input: ProfileInput,
  { markOnboarded = false }: { markOnboarded?: boolean } = {}
): Promise<ProfileView> {
  if (input.orgUrl && !(await isOrgUrlAvailable(input.orgUrl, userId))) {
    throw new ProfileError("That organization URL is already taken", 409);
  }

  const [current] = await db
    .select({ currency: users.currency, onboardedAt: users.onboardedAt })
    .from(users)
    .where(eq(users.id, userId));
  if (!current) throw new ProfileError("User not found", 404);

  // Currency is fixed once chosen: it determines how existing events are
  // priced, so changing it would silently reinterpret every stored amount.
  const currency = current.currency ?? input.currency ?? null;

  const name = [input.firstName, input.lastName].filter(Boolean).join(" ");

  await db
    .update(users)
    .set({
      ...(input.firstName !== undefined && { firstName: input.firstName }),
      ...(input.lastName !== undefined && { lastName: input.lastName }),
      ...(name && { name }),
      ...(input.orgName !== undefined && { orgName: input.orgName }),
      ...(input.orgUrl !== undefined && { orgUrl: input.orgUrl }),
      currency,
      ...(markOnboarded &&
        current.onboardedAt == null && { onboardedAt: new Date() }),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  const profile = await getProfile(userId);
  if (!profile) throw new ProfileError("User not found", 404);
  return profile;
}

/** Resolve an organization page slug to its owner. */
export async function findUserByOrgUrl(orgUrl: string) {
  const [user] = await db
    .select({
      id: users.id,
      orgName: users.orgName,
      orgUrl: users.orgUrl,
      image: users.image,
      currency: users.currency,
    })
    .from(users)
    .where(sql`lower(${users.orgUrl}) = lower(${orgUrl})`)
    .limit(1);
  return user ?? null;
}
