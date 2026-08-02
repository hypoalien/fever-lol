# Deploying to Cloudflare Workers

The app runs on Workers through [OpenNext](https://opennext.js.org/cloudflare).
Nothing about the application code is Cloudflare-specific — the same build runs
on Node — so this is a hosting choice rather than a lock-in.

## What you need

- A Cloudflare account
- A Postgres database reachable from the internet. [Neon](https://neon.tech)'s
  free tier is more than enough to start.

## One-time setup

### 1. Authenticate

```bash
bunx wrangler login
```

### 2. Put Hyperdrive in front of Postgres

Every Worker isolate would otherwise open its own connection straight to
Postgres, which a serverless database will not thank you for. Hyperdrive pools
them on Cloudflare's side.

```bash
bunx wrangler hyperdrive create fever-lol-db \
  --connection-string "postgres://user:password@host/dbname?sslmode=require"
```

Copy the id it prints into `wrangler.jsonc`, replacing
`REPLACE_WITH_HYPERDRIVE_ID`.

The application reads the connection string from that binding at runtime and
falls back to `DATABASE_URL` everywhere else, so local development, CI and any
non-Cloudflare deployment are unaffected.

### 3. Create the flyer bucket

```bash
bunx wrangler r2 bucket create fever-lol-flyers
bunx wrangler r2 bucket create fever-lol-flyers-preview
```

### 4. Set the secrets

Vars in `wrangler.jsonc` are public; anything sensitive goes here.

```bash
bunx wrangler secret put BETTER_AUTH_SECRET     # openssl rand -base64 32
bunx wrangler secret put ENCRYPTION_KEY         # encrypts organizers' gateway keys
bunx wrangler secret put AUTH_GOOGLE_ID
bunx wrangler secret put AUTH_GOOGLE_SECRET
bunx wrangler secret put AUTH_RESEND_KEY
bunx wrangler secret put EMAIL_FROM             # "Name <you@yourdomain.com>"
bunx wrangler secret put RAZORPAY_KEY_ID
bunx wrangler secret put RAZORPAY_KEY_SECRET
```

`NEXT_PUBLIC_*` values are inlined at build time, so they belong in
`wrangler.jsonc` under `vars` — not here.

### 5. Migrate

Migrations run against Postgres directly, not through the Worker:

```bash
DATABASE_URL="<your neon connection string>" bun run db:migrate
```

## Deploying

```bash
bun run cf:preview   # build and serve locally on workerd
bun run cf:deploy    # build and push
```

`cf:preview` is worth using before every deploy. It runs the real Worker
runtime, which is stricter than Node in ways that matter — see below.

## Things that behave differently on Workers

**A socket belongs to the request that opened it.** Caching a Postgres client
across requests makes the next request hang until the runtime kills it. The
client in `lib/db/index.ts` is created per request when the Hyperdrive binding
is present, and cached otherwise. This was found by running `cf:preview`, not
by reading the code.

**`nodejs_compat` is required.** postgres.js, `node:crypto` and Better Auth all
use Node built-ins.

**The compatibility date matters.** With a 2025-or-later date, `process.env` is
populated from vars and secrets automatically.

## Custom domain

Add a route in `wrangler.jsonc`:

```jsonc
"routes": [{ "pattern": "fever.lol", "custom_domain": true }]
```

Then set `NEXT_PUBLIC_SITE_URL` and `BETTER_AUTH_URL` to match, or magic links
and canonical URLs will point at `workers.dev`.

## Moving off Vercel

1. Deploy to Workers and check it on the `workers.dev` URL.
2. Point DNS at Cloudflare.
3. Remove the domain from the Vercel project.
4. Delete the Vercel project once you are happy.

Keep the Vercel deployment running until the Cloudflare one is serving real
traffic — there is no reason to have a gap.
