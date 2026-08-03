# Contributing

Thanks for taking a look. Issues and pull requests are both welcome.

## Getting set up

See the [README](README.md#running-it-locally). Short version:

```bash
bun install
cp .env.example .env.local
bun run db:up && bun run db:migrate && bun run db:seed
bun run dev
```

You do not need Google OAuth, Resend, Razorpay, AWS or PostHog credentials to
work on most of the project. Magic links print to the terminal in development,
and every integration degrades to a clear error or a no-op when its key is
absent.

## Before opening a pull request

```bash
bun run test:all
```

That runs typecheck, lint, unit tests, integration tests and Playwright. CI
runs the same thing, split into three jobs so a failure tells you which layer
broke.

## Things reviewers will look for

**Money is an integer count of minor units.** Never a float, never a decimal
string past the boundary. Anything holding an amount is named `...Minor`.
`lib/money.ts` is the only place that converts between minor units and a
human-readable amount.

**Database access goes through `lib/data/`.** Route handlers should read as a
sequence of intentions — authorise, validate, call a repository, shape a
response. Queries inline in a handler will be asked about.

**Invariants belong in the schema.** If something must never be true, prefer a
check constraint or a unique index over a runtime check that a concurrent
request can slip past. Ticket stock and payment idempotency both work this
way, and there are integration tests asserting the database rejects the bad
case.

**No `any`.** The lint rule is an error, not a warning. Where a shape is
genuinely dynamic, use `unknown` and narrow it.

**Validate at the edge.** Every route handler parses its input with Zod. A
field the client can send that the server does not validate is a bug waiting
to happen — that is exactly how the checkout came to accept prices from the
browser.

## Tests

Three layers, and they are not interchangeable:

- `tests/unit` — pure functions, no services. Pricing and money logic lives here.
- `tests/integration` — a real Postgres. Use these to assert the *database*
  rejects bad data, not that the application remembers to check.
- `tests/e2e` — Playwright against a production build. Use these for flows a
  user actually performs.

Integration and e2e each use their own database and truncate between cases, so
they cannot disturb your development data.

## Commit messages

Explain why the change is needed, not only what it does. If you fixed a bug,
say what the broken behaviour was — that is the part a reader six months from
now cannot reconstruct.

## Reporting a vulnerability

Please open a [security advisory](https://github.com/hypoalien/fever-lol/security/advisories/new)
rather than a public issue.
