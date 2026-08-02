import Link from "next/link";
import type { Metadata } from "next";

import { HeroTicket } from "@/components/marketing/ticket";
import { FAQS } from "@/lib/marketing-content";
import "./marketing.css";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fever.lol";

export const metadata: Metadata = {
  title: "Fever.lol — Sell event tickets with zero platform fees",
  description:
    "Open-source event ticketing. Sell tiered tickets, apply promo codes and scan attendees in by QR code. No platform fee, payouts straight to your own Stripe or Razorpay account, and the whole thing is yours to self-host.",
  keywords: [
    "event ticketing software",
    "sell event tickets online",
    "open source ticketing platform",
    "zero platform fee ticketing",
    "eventbrite alternative",
    "self-hosted ticketing",
    "QR code check-in",
    "event management platform",
  ],
  alternates: { canonical: SITE },
  openGraph: {
    type: "website",
    url: SITE,
    siteName: "Fever.lol",
    title: "Sell event tickets and keep all the money",
    description:
      "Open-source ticketing with no platform fee. Buyers pay your own payment account directly — we never hold the funds.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Fever.lol — open-source event ticketing with zero platform fees",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sell event tickets and keep all the money",
    description:
      "Open-source ticketing with no platform fee. Payouts go straight to your own account.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

const REPO = "https://github.com/hypoalien/fever-lol";

// Read at build time. Calling new Date() during render makes the page
// dynamic in Next 16, which costs the whole page its prerendered HTML.
const YEAR = new Date().getFullYear();

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
                Open source · MIT licensed
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
                MIT licensed
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
            <span>© {YEAR} Fever.lol</span>
            <span>Built in the open</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
