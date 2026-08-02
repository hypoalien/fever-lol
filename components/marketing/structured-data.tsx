/**
 * JSON-LD for the landing page.
 *
 * Three graphs search engines actually use: the organization behind the site,
 * the product itself with its price, and the FAQ, which is eligible for a rich
 * result. Rendered server-side so crawlers see it without running JavaScript.
 */

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fever.lol";

import type { FaqEntry } from "@/lib/marketing-content";

/** Builds the JSON-LD graph. Serialised into the document head by the layout. */
export function buildStructuredData(faqs: FaqEntry[]): string {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE}/#organization`,
        name: "Fever.lol",
        url: SITE,
        logo: `${SITE}/logo.png`,
        description:
          "Open-source event ticketing with zero platform fees. Organizers connect their own payment gateway and receive payouts directly.",
        sameAs: ["https://github.com/hypoalien/fever-lol"],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE}/#website`,
        url: SITE,
        name: "Fever.lol",
        publisher: { "@id": `${SITE}/#organization` },
        inLanguage: "en",
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE}/#software`,
        name: "Fever.lol",
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "Event Ticketing",
        operatingSystem: "Web",
        url: SITE,
        description:
          "Create events, sell tiered tickets, apply promo codes and check attendees in by QR code. No platform fee; payouts go straight to the organizer's own payment account.",
        license: "https://opensource.org/licenses/MIT",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          description: "No platform fee on ticket sales.",
        },
        featureList: [
          "Tiered ticketing with per-tier allocation",
          "Promo codes with minimum spend and redemption limits",
          "QR code check-in from any browser",
          "Attendee and order management",
          "Self-hostable",
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${SITE}/#faq`,
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.q,
          acceptedAnswer: { "@type": "Answer", text: faq.a },
        })),
      },
    ],
  };

  // Escaped so the payload cannot terminate the surrounding script element.
  return JSON.stringify(graph).replace(/</g, "\\u003c");
}
