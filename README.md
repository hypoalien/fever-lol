# fever.lol

Open-source event ticketing. Organizers connect their own payment gateway, so
money goes straight to them — the platform never holds funds and takes no cut.

[fever.lol](https://fever.lol)

---

## What it does

- **Events** with multiple dates, tiered tickets, per-tier allocation and promo codes
- **Anonymous checkout** — buyers don't need an account
- **QR check-in** from any phone browser, no app and no hardware
- **Organizer dashboard** with orders, attendees and revenue
- **Self-hostable**, and the hosted version runs the same code

## How it's put together

| | |
|---|---|
| Framework | Next.js 16 (App Router), React 19 |
| Language | TypeScript, strict, no `any` |
| Database | PostgreSQL with Drizzle ORM |
| Auth | Better Auth — Google OAuth and magic links |
| Payments | Razorpay (Stripe planned) |
| Storage | S3-compatible, for event flyers |
| Email | Resend |
| Analytics | PostHog, optional |
| Tests | Vitest (unit + integration), Playwright (e2e) |

### Two conventions worth knowing before you read the code

**Money is always an integer count of minor units** — paise, cents. Every
column and field carrying an amount is suffixed `Minor`. There are no floats
and no `numeric` columns read back as strings. `lib/money.ts` is the only place
that converts, and it parses decimal strings textually rather than through a
float so `1.005` doesn't round down. See `lib/pricing.ts` for the fee maths.

**Correctness lives in the database.** Ticket stock is a column with a check
constraint, so overselling fails at Postgres rather than depending on the
application getting a race right. Orders carry a unique index on the gateway
payment id, so a replayed confirmation cannot mint a second set of tickets.
The integration tests assert these directly.

## Running it locally

You need [Bun](https://bun.sh) and Docker.

```bash
git clone https://github.com/hypoalien/fever-lol.git
cd fever-lol
bun install

cp .env.example .env.local     # DATABASE_URL is the only required value

bun run db:up                  # Postgres on port 5433
bun run db:migrate
bun run db:seed                # an organizer, two venues, three events

bun run dev
```

Open <http://localhost:3000>.

To sign in, enter any email on `/login`. Outside production the magic link is
**printed to the terminal** rather than emailed, so you don't need a Resend
account to develop. The seeded organizer is `organizer@fever.local`.

Everything except `DATABASE_URL` is optional. Without payment keys, checkout
returns a clear 503 instead of failing obscurely; without a PostHog key,
analytics is a no-op.

### Commands

```bash
bun run dev               # development server
bun run build             # production build
bun run typecheck         # tsc --noEmit
bun run lint              # eslint

bun run test              # unit tests
bun run test:integration  # integration tests, against their own database
bun run test:e2e          # Playwright, against a production build
bun run test:all          # all of the above

bun run db:up             # start Postgres
bun run db:generate       # create a migration from schema changes
bun run db:migrate        # apply migrations
bun run db:seed           # reset the sample data
bun run db:studio         # browse the database
```

Integration and e2e tests each use their **own** database and truncate freely,
so a test run can never disturb your development data.

## Layout

```
app/
  api/            route handlers — thin, validated with Zod
  dashboard/      organizer screens
  events/         public event pages
  checkout/       buyer flow
  page.tsx        landing page
lib/
  db/             Drizzle schema and client
  data/           repositories; all database access goes through here
  money.ts        minor-unit arithmetic
  pricing.ts      cart resolution and fee calculation — pure, unit-tested
  auth.ts         Better Auth configuration
  analytics/      PostHog, client and server
tests/
  unit/           pure logic, no services
  integration/    real Postgres, asserts database constraints
  e2e/            Playwright against a production build
drizzle/          generated migrations
scripts/          seed, one-off imports
```

## Self-hosting

The Docker Compose file runs the app and a database together:

```bash
cp .env.example .env
docker compose --profile app up --build
```

You'll want to set, at minimum:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET` — `openssl rand -base64 32`
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`, or rely on magic links
- `AUTH_RESEND_KEY` and `EMAIL_FROM`, for magic links to actually be delivered
- `ENCRYPTION_KEY`, used to encrypt organizers' gateway secrets at rest

`EMAIL_FROM` must be a full sender address — `Name <you@example.com>` or
`you@example.com`. A bare domain is rejected by Resend.

## Contributing

Issues and pull requests are welcome. Before opening a PR:

```bash
bun run test:all
```

CI runs the same checks. Two things reviewers will look for: amounts handled
in minor units, and database access going through `lib/data/` rather than
inline queries in route handlers.

## Security

If you find a vulnerability, please open a
[security advisory](https://github.com/hypoalien/fever-lol/security/advisories/new)
rather than a public issue.

## License

MIT — see [LICENSE](LICENSE).
