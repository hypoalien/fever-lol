/**
 * Build the Worker without shipping local secrets inside it.
 *
 * OpenNext reads every .env file it can find at build time and writes the
 * merged result into `.open-next/cloudflare/next-env.mjs`, which is bundled
 * into the Worker and used to populate `process.env` at runtime. There is no
 * option to turn that off — the only lever is which .env files exist while the
 * build runs.
 *
 * Left alone, that put a developer's whole `.env.local` — database URL, auth
 * secret, encryption key, OAuth client secret, Resend key, an old Mongo URI
 * and AWS pair — in plaintext inside a deployed artifact. Worse, the values it
 * injects fill unset gaps at runtime (`??=`), so a stale test payment key was
 * silently making the app report that payments were configured.
 *
 * So: hide the local env files, build, restore them, then *verify* the
 * generated file carries nothing secret. The verification is the point — this
 * class of leak is invisible unless something checks.
 *
 * Everything the Worker needs at runtime comes from wrangler vars and
 * `wrangler secret put`. The only values that legitimately belong at build
 * time are `NEXT_PUBLIC_*`, which are compiled into the client bundle and are
 * public by definition; those live in .env.production, which is committed.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

/** Local, developer-specific, and never appropriate to bundle. */
const HIDE = [".env", ".env.local", ".env.production.local", ".env.development.local"];

/**
 * Anything matching these may not appear in the generated env file. Substring
 * match on the key, so SECRET catches AUTH_GOOGLE_SECRET and R2_SECRET_*.
 */
const FORBIDDEN = [
  "SECRET",
  "PASSWORD",
  "TOKEN",
  "_KEY",
  "KEY_ID",
  "DATABASE_URL",
  "MONGODB_URI",
  "ENCRYPTION",
  "CREDENTIAL",
];

/** NEXT_PUBLIC_* ships to the browser anyway, so it is exempt by definition. */
function isAllowed(key) {
  if (key.startsWith("NEXT_PUBLIC_")) return true;
  return !FORBIDDEN.some((needle) => key.includes(needle));
}

const hidden = [];
try {
  for (const name of HIDE) {
    const from = path.join(ROOT, name);
    if (fs.existsSync(from)) {
      const to = `${from}.build-hidden`;
      fs.renameSync(from, to);
      hidden.push([to, from]);
    }
  }
  if (hidden.length) {
    console.log(
      `Hidden during build: ${hidden.map(([, f]) => path.basename(f)).join(", ")}`
    );
  }

  // Next evaluates route modules while collecting page data, so anything that
  // throws on a missing variable at import time fails the build. These are
  // passed through the *process* environment, which OpenNext does not read —
  // it only merges .env files — so they satisfy the build without being
  // compiled into the Worker. The real values arrive from wrangler secrets at
  // runtime; these placeholders are deliberately unusable.
  const buildOnly = {
    NEXTAUTH_SECRET: "build-time-placeholder-not-used-at-runtime",
    BETTER_AUTH_SECRET: "build-time-placeholder-not-used-at-runtime",
    ENCRYPTION_KEY: "build-time-placeholder-not-used-at-runtime",
  };

  execFileSync("bunx", ["opennextjs-cloudflare", "build"], {
    stdio: "inherit",
    env: { ...process.env, ...buildOnly },
  });
} finally {
  // Restored even if the build threw, or a failed build would leave the
  // developer without their env files.
  for (const [from, to] of hidden) fs.renameSync(from, to);
}

const generated = path.join(ROOT, ".open-next", "cloudflare", "next-env.mjs");
if (!fs.existsSync(generated)) {
  console.error(`Expected ${generated} to exist after the build.`);
  process.exit(1);
}

const source = fs.readFileSync(generated, "utf8");
const keys = new Set();
for (const match of source.matchAll(/"([A-Z0-9_]+)":/g)) keys.add(match[1]);

const leaked = [...keys].filter((key) => !isAllowed(key)).sort();

if (leaked.length) {
  console.error(
    "\nBuild aborted: secret-looking values were compiled into the Worker.\n" +
      "next-env.mjs would ship these keys:\n" +
      leaked.map((k) => `  - ${k}`).join("\n") +
      "\n\nMove them out of the .env files this script hides, and supply them\n" +
      "with `wrangler secret put` instead.\n"
  );
  process.exit(1);
}

console.log(
  `\nnext-env.mjs is clean — ${keys.size} key(s), none secret-looking.\n` +
    "Worker build complete."
);
