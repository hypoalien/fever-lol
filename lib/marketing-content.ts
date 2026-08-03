/**
 * Landing page copy that is needed in two places: rendered on the page, and
 * emitted as FAQPage structured data from the document head.
 */

export interface FaqEntry {
  q: string;
  a: string;
}

export const FAQS: FaqEntry[] = [
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
