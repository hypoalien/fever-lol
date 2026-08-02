import Link from "next/link";
import type { Metadata } from "next";

import { HeroTicket } from "@/components/marketing/ticket";
import "./marketing.css";

export const metadata: Metadata = {
  title: "Fever.lol — Sell tickets, keep the money",
  description:
    "Open-source event ticketing. Zero platform fees, payouts straight to your own account, and the whole thing is yours to self-host.",
};

const REPO = "https://github.com/hypoalien/fever-lol";

/** A section marker. A roll of tickets is numbered, so the sequence is real. */
function Serial({ n, label }: { n: string; label: string }) {
  return (
    <p className="mkt-serial mkt-data">
      <span>{n}</span>
      <span>{label}</span>
    </p>
  );
}

function Perforation() {
  return <div className="mkt-perf" role="presentation" />;
}

/* The comparison is the whole pitch, so the numbers are stated plainly and
   sourced, rather than gestured at with a vague "save more". */
const FEES = [
  {
    name: "Eventbrite",
    amount: "$3.79",
    note: "3.7% + $1.79 per ticket, plus 2.9% payment processing. Taken before you see it.",
  },
  {
    name: "Ticket Tailor",
    amount: "$0.65",
    note: "Per issued ticket on pay-as-you-go, before payment processing.",
  },
  {
    name: "Fever.lol",
    amount: "$0.00",
    note: "You connect your own Stripe or Razorpay account. We never touch the money.",
    ours: true,
  },
];

const STEPS = [
  {
    title: "Connect your gateway",
    body: "Add your own Stripe or Razorpay keys. Payouts land in your account on your schedule, not ours.",
  },
  {
    title: "Build the event",
    body: "Dates, venue, ticket tiers, promo codes. Save as a draft until it's ready.",
  },
  {
    title: "Publish and sell",
    body: "You get a public page. Buyers check out without making an account.",
  },
  {
    title: "Scan at the door",
    body: "Open the scanner on your phone. Each ticket admits once, even with two people scanning.",
  },
];

const FEATURES = [
  {
    title: "Tiered ticketing",
    body: "Early bird, general, VIP — each with its own price and allocation. Stock is enforced by the database, so you cannot oversell.",
  },
  {
    title: "Promo codes",
    body: "Flat or percentage, with minimum spend and redemption limits.",
  },
  {
    title: "QR check-in",
    body: "Scan from any phone browser. No app, no hardware, no per-scan charge.",
  },
  {
    title: "Attendee lists",
    body: "Who bought what, who has arrived, exportable whenever you want it.",
  },
  {
    title: "Multiple venues",
    body: "Save the rooms you use and reuse them across events.",
  },
  {
    title: "Your data",
    body: "It is your database. Take a dump of it, move it, or host the whole platform yourself.",
  },
];

const FAQS = [
  {
    q: "How do you make money if the platform fee is zero?",
    a: "Right now, we don't. Fever.lol is an open-source project rather than a company, and hosting it costs very little. If a paid tier appears later it will be for things that genuinely cost us money — and the self-hosted version will always do everything the hosted one does.",
  },
  {
    q: "Where does the money actually go?",
    a: "Into your own Stripe or Razorpay account, directly. We are not a merchant of record and we never hold your funds, which also means there is no payout delay to wait on.",
  },
  {
    q: "Can I run this on my own server?",
    a: "Yes, and that is a first-class path rather than an afterthought. It is a Next.js app with a Postgres database — there is a Docker Compose file in the repo and the README walks through it.",
  },
  {
    q: "What happens if two people scan the same ticket?",
    a: "One is admitted and the other is told the ticket has already been used. The check is a single guarded write, so it holds even when both scans land at the same instant.",
  },
  {
    q: "Which currencies do you support?",
    a: "USD, EUR, GBP and INR today. Razorpay covers Indian payments and Stripe covers the rest. More are on the way.",
  },
];

export default function Page() {
  return (
    <div className="mkt">
      <header className="mkt-nav">
        <div className="mkt-shell mkt-nav-inner">
          <Link href="/" className="mkt-wordmark">
            Fever<span style={{ color: "var(--blue)" }}>.</span>lol
          </Link>
          <nav className="mkt-nav-links" aria-label="Main">
            <a className="mkt-nav-link" href="#pricing">
              Pricing
            </a>
            <a className="mkt-nav-link" href="#how">
              How it works
            </a>
            <a className="mkt-nav-link" href="#open-source">
              Open source
            </a>
            <a className="mkt-nav-link" href="#faq">
              FAQ
            </a>
          </nav>
          <Link href="/login" className="mkt-btn mkt-btn-primary">
            Create an event
          </Link>
        </div>
      </header>

      <main>
        <section className="mkt-shell mkt-hero">
          <div className="mkt-hero-grid">
            <div>
              <span className="mkt-badge mkt-data">
                <span className="mkt-live-dot" aria-hidden="true" />
                Open source · AGPL-3.0
              </span>

              <h1 className="mkt-display">
                Sell tickets.
                <br />
                Keep <em>all</em> the money.
              </h1>

              <p className="mkt-lede">
                Most ticketing platforms take a cut of every sale and sit on your
                payouts for weeks. Fever.lol takes nothing and holds nothing —
                buyers pay your payment account directly.
              </p>

              <div className="mkt-hero-actions">
                <Link href="/login" className="mkt-btn mkt-btn-primary">
                  Create an event
                </Link>
                <a
                  className="mkt-btn mkt-btn-ghost"
                  href={REPO}
                  target="_blank"
                  rel="noreferrer"
                >
                  Read the source
                </a>
              </div>
            </div>

            <HeroTicket />
          </div>
        </section>

        <Perforation />

        <section id="pricing" className="mkt-shell mkt-section">
          <Serial n="01" label="What a ticket costs you" />
          <h2 className="mkt-title mkt-display">The fee on a $25 ticket</h2>
          <p className="mkt-sub">
            Published rates, before payment processing. Sell two hundred tickets
            at $25 and the difference is the better part of a venue deposit.
          </p>

          <div className="mkt-fees">
            {FEES.map((fee) => (
              <div
                key={fee.name}
                className="mkt-fee-card"
                data-ours={fee.ours ? "true" : "false"}
              >
                <p className="mkt-data" style={{ color: "var(--ink-soft)" }}>
                  {fee.name}
                </p>
                <p className="mkt-fee-amount">{fee.amount}</p>
                <p className="mkt-fee-note">{fee.note}</p>
              </div>
            ))}
          </div>
        </section>

        <Perforation />

        <section id="how" className="mkt-shell mkt-section">
          <Serial n="02" label="From nothing to doors open" />
          <h2 className="mkt-title mkt-display">Four steps, one evening</h2>
          <p className="mkt-sub">
            You need a payment account and a date. Everything else can wait until
            you are ready to publish.
          </p>

          <div className="mkt-steps">
            {STEPS.map((step, index) => (
              <div className="mkt-step" key={step.title}>
                <span className="mkt-step-n">{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <Perforation />

        <section className="mkt-shell mkt-section">
          <Serial n="03" label="What you get" />
          <h2 className="mkt-title mkt-display">Everything a door needs</h2>
          <p className="mkt-sub">
            No tiers, no upsells, no feature held back for a plan you have not
            bought.
          </p>

          <div className="mkt-grid">
            {FEATURES.map((feature) => (
              <div className="mkt-card" key={feature.title}>
                <svg
                  className="mkt-card-icon"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="square"
                  aria-hidden="true"
                >
                  <path d="M4 8V6h16v2a2 2 0 0 0 0 4v2H4v-2a2 2 0 0 0 0-4Z" />
                </svg>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </div>
            ))}
          </div>
        </section>

        <Perforation />

        <section id="open-source" className="mkt-shell mkt-section">
          <Serial n="04" label="Run it yourself" />
          <div className="mkt-os">
            <div>
              <span className="mkt-data" style={{ color: "var(--lime)" }}>
                AGPL-3.0
              </span>
              <h2 className="mkt-display">No trust required</h2>
              <p>
                The entire platform is public — the checkout, the fee maths, the
                database schema. If you would rather not take our word for any of
                it, read the code. If you would rather not use our servers, run
                your own copy; it is the same software.
              </p>
              <div className="mkt-hero-actions">
                <a
                  className="mkt-btn mkt-btn-ghost"
                  href={REPO}
                  target="_blank"
                  rel="noreferrer"
                >
                  View on GitHub
                </a>
              </div>
            </div>

            <pre className="mkt-terminal">
              <code>
                <span className="c"># self-host in three commands</span>
                {"\n"}
                <span className="p">$</span> git clone {REPO.replace("https://", "")}
                {"\n"}
                <span className="p">$</span> docker compose up -d postgres
                {"\n"}
                <span className="p">$</span> bun run db:migrate && bun run dev
              </code>
            </pre>
          </div>
        </section>

        <Perforation />

        <section id="faq" className="mkt-shell mkt-section">
          <Serial n="05" label="Before you ask" />
          <h2 className="mkt-title mkt-display">Reasonable suspicions</h2>

          <div className="mkt-faq">
            {FAQS.map((faq) => (
              <details key={faq.q}>
                <summary>{faq.q}</summary>
                <p>{faq.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="mkt-footer">
        <div className="mkt-shell">
          <div className="mkt-footer-grid">
            <div>
              <p className="mkt-wordmark" style={{ display: "block" }}>
                Fever<span style={{ color: "var(--blue)" }}>.</span>lol
              </p>
              <p
                className="mkt-fee-note"
                style={{ marginTop: "0.75rem", maxWidth: "34ch" }}
              >
                Open-source event ticketing for people who would rather keep
                their own money.
              </p>
            </div>

            <div>
              <h4 className="mkt-data">Product</h4>
              <ul>
                <li>
                  <a href="#pricing">Pricing</a>
                </li>
                <li>
                  <a href="#how">How it works</a>
                </li>
                <li>
                  <Link href="/login">Create an event</Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mkt-data">Project</h4>
              <ul>
                <li>
                  <a href={REPO} target="_blank" rel="noreferrer">
                    GitHub
                  </a>
                </li>
                <li>
                  <a href={`${REPO}/issues`} target="_blank" rel="noreferrer">
                    Report an issue
                  </a>
                </li>
                <li>
                  <a
                    href={`${REPO}/blob/main/README.md`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Self-host guide
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mkt-colophon mkt-data">
            <span>© {new Date().getFullYear()} Fever.lol</span>
            <span>Built in the open</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
