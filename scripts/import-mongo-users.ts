/**
 * One-off import of the existing organizers from MongoDB into Postgres.
 *
 * The production Mongo store holds 8 users and 8 Google account links (plus a
 * single stub draft event and expired verification tokens, neither of which is
 * worth carrying over). This brings the people across so they can sign back in
 * with the same Google account and land on their existing profile.
 *
 * Idempotent: matching is by lowercased email, so re-running updates rather
 * than duplicating. Read-only against Mongo.
 *
 * Runs under tsx/Node rather than Bun: Bun cannot load the MongoDB driver's
 * bson dependency, which calls node:v8 isBuildingSnapshot (unimplemented there).
 *
 *   bun run users:import:dry
 *   bun run users:import
 */

import { MongoClient, type Document } from "mongodb";
import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { accounts, users } from "@/lib/db/schema";
import { isSupportedCurrency } from "@/lib/money";

const DRY_RUN = process.argv.includes("--dry-run");

function readString(source: Document, key: string): string | null {
  const value = source[key];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

/** Existing records carry "" and unsupported codes; both mean "unset". */
function readCurrency(source: Document): string | null {
  const value = readString(source, "currency");
  return value && isSupportedCurrency(value) ? value : null;
}

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is required");

  const mongo = new MongoClient(uri);
  await mongo.connect();

  try {
    // The connection string names no database, so it resolves to `test` —
    // which is where all live data has in fact been written.
    const source = mongo.db();
    const mongoUsers = await source.collection("users").find().toArray();
    const mongoAccounts = await source.collection("accounts").find().toArray();

    console.log(
      `found ${mongoUsers.length} users and ${mongoAccounts.length} account links`
    );
    if (DRY_RUN) console.log("(dry run — nothing will be written)\n");

    const accountsByUser = new Map<string, Document[]>();
    for (const account of mongoAccounts) {
      const key = String(account.userId);
      accountsByUser.set(key, [...(accountsByUser.get(key) ?? []), account]);
    }

    let imported = 0;
    let linked = 0;

    for (const mongoUser of mongoUsers) {
      const email = readString(mongoUser, "email");
      if (!email) {
        console.warn(`skipping ${mongoUser._id}: no email`);
        continue;
      }

      const name = readString(mongoUser, "name") ?? "";
      const values = {
        email,
        name,
        firstName: readString(mongoUser, "firstName"),
        lastName: readString(mongoUser, "lastName"),
        image: readString(mongoUser, "image"),
        orgName: readString(mongoUser, "orgName"),
        orgUrl: readString(mongoUser, "orgUrl"),
        currency: readCurrency(mongoUser),
        // Everyone here signed in through Google, which verifies the address.
        emailVerified: true,
        // The ObjectId's leading four bytes are the creation timestamp.
        createdAt: new Date(
          parseInt(String(mongoUser._id).slice(0, 8), 16) * 1000
        ),
        // Only those who filled in org details actually finished onboarding.
        onboardedAt: readString(mongoUser, "orgName") ? new Date() : null,
      };

      if (DRY_RUN) {
        console.log(
          `would import ${email}` +
            (values.orgName ? ` (${values.orgName})` : " (no profile)")
        );
        imported += 1;
        continue;
      }

      // Matched case-insensitively to mirror the unique index. Done as an
      // explicit lookup rather than ON CONFLICT because the index is on an
      // expression, which Drizzle's conflict target does not accept.
      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(sql`lower(${users.email}) = lower(${email})`)
        .limit(1);

      const row = existing
        ? (
            await db
              .update(users)
              .set({
                name: values.name,
                firstName: values.firstName,
                lastName: values.lastName,
                image: values.image,
                orgName: values.orgName,
                orgUrl: values.orgUrl,
                currency: values.currency,
                updatedAt: new Date(),
              })
              .where(sql`${users.id} = ${existing.id}`)
              .returning({ id: users.id })
          )[0]
        : (await db.insert(users).values(values).returning({ id: users.id }))[0];

      imported += 1;

      for (const account of accountsByUser.get(String(mongoUser._id)) ?? []) {
        const providerId = readString(account, "provider");
        const accountId = readString(account, "providerAccountId");
        if (!providerId || !accountId) continue;

        await db
          .insert(accounts)
          .values({
            id: crypto.randomUUID(),
            userId: row.id,
            providerId,
            accountId,
            // Access and refresh tokens are deliberately not carried over:
            // they are stale, and re-consenting on next sign-in is cleaner
            // than importing credentials we cannot validate.
            scope: readString(account, "scope"),
          })
          .onConflictDoNothing({
            target: [accounts.providerId, accounts.accountId],
          });
        linked += 1;
      }
    }

    console.log(
      `\n${DRY_RUN ? "would import" : "imported"} ${imported} user(s)` +
        (DRY_RUN ? "" : ` and ${linked} account link(s)`)
    );
  } finally {
    await mongo.close();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
