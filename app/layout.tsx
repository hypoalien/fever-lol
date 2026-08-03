import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Archivo, Figtree } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import { CurrencyProvider } from "@/contexts/currency-context";
import { Toaster } from "@/components/ui/sonner";
import { AnalyticsProvider } from "@/lib/analytics/client";
import { buildStructuredData } from "@/components/marketing/structured-data";
import { FAQS } from "@/lib/marketing-content";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

// Was a Google Fonts @import inside globals.css, which render-blocks and — after
// the Tailwind directives expand — violates the CSS rule that @import must come
// first. next/font self-hosts it and inlines the font-face declarations.
// Display face for the landing page. Variable width axis, so headings can be
// set expanded the way printed ticket headers are.
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

const figtree = Figtree({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-figtree",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://fever.lol"),
  title: {
    default: "Fever.lol - Open Source Event Management Platform",
    template: "%s | Fever.lol",
  },
  description:
    "The open-source event platform that puts you in control. Create, sell, and manage events with zero platform fees, complete freedom, and no hidden costs.",
  keywords: [
    "event management",
    "ticketing platform",
    "event tickets",
    "open source",
    "zero platform fees",
    "event planning",
    "ticket sales",
    "event organization",
    "QR code tickets",
    "event dashboard",
  ],
  authors: [
    {
      name: "Anudeep",
      url: "https://fever.lol",
    },
  ],
  creator: "Anudeep",
  publisher: "Fever.lol",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://fever.lol",
    title: "Fever.lol - Open Source Event Management Platform",
    description:
      "Create, sell, and manage events with zero platform fees. The open-source event platform that puts you in control.",
    siteName: "Fever.lol",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Fever.lol Platform Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fever.lol - Open Source Event Management Platform",
    description:
      "Create, sell, and manage events with zero platform fees. The open-source event platform that puts you in control.",
    images: ["/og-image.png"],
    creator: "@fever_lol",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    // These live under /favicon/; the previous paths 404'd.
    icon: [
      { url: "/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "/favicon/favicon.ico",
    apple: "/favicon/apple-touch-icon.png",
  },
  manifest: "/favicon/site.webmanifest",
  // Verification tags are only emitted once a real token is configured;
  // placeholders were being rendered literally into the head.
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? {
        verification: {
          google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
        },
      }
    : {}),
  category: "Event Management",
  classification: "Event Platform",
  alternates: {
    canonical: "https://fever.lol",
    languages: {
      "en-US": "https://fever.lol",
    },
  },
};

// Next moved viewport out of the metadata export; keeping it there is a no-op.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Emitted here rather than from the page: React 19 keeps an inline
            script rendered in the body inside the RSC payload, so crawlers
            reading raw HTML never see it. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: buildStructuredData(FAQS) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${figtree.variable} ${archivo.variable} font-sans antialiased`}
      >
        <AnalyticsProvider>
          <CurrencyProvider>
            {children}
            <Script
              src="https://checkout.razorpay.com/v1/checkout.js"
              strategy="lazyOnload"
            />
            <Toaster />
          </CurrencyProvider>
        </AnalyticsProvider>
      </body>
    </html>
  );
}
