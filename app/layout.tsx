import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Figtree } from "next/font/google";
import "./globals.css";
import SessionWrapper from "@/components/session-wrapper";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import Script from "next/script";
import { CurrencyProvider } from "@/contexts/currency-context";
import { Toaster } from "@/components/ui/sonner";

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
        url: "/og-image.png", // Add your OG image path
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
    images: ["/og-image.png"], // Add your Twitter image path
    creator: "@fever_lol", // Add your Twitter handle
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
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
    other: {
      rel: "apple-touch-icon-precomposed",
      url: "/apple-touch-icon-precomposed.png",
    },
  },
  manifest: "/site.webmanifest",
  verification: {
    google: "your-google-site-verification",
    yandex: "your-yandex-verification",
    yahoo: "your-yahoo-verification",
    other: {
      "facebook-domain-verification": "your-facebook-domain-verification",
    },
  },
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${figtree.variable} font-sans antialiased`}
      >
        <SessionWrapper>
          <CurrencyProvider>
            <NuqsAdapter>
              {children}{" "}
              <Script
                src="https://checkout.razorpay.com/v1/checkout.js"
                strategy="lazyOnload"
              />
              <Toaster />
            </NuqsAdapter>
          </CurrencyProvider>
        </SessionWrapper>
      </body>
    </html>
  );
}
