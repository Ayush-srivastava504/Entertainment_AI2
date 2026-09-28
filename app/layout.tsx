import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Bricolage_Grotesque, Literata } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { buildOgImageUrl } from "@/lib/og";
import { getBaseUrl, SITE_NAME } from "@/lib/site";

// Google Analytics 4 measurement id. Falls back to the id already wired up
// on the site; override with NEXT_PUBLIC_GA_MEASUREMENT_ID in Vercel env
// vars if you ever move to a different GA4 property.
const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-ZEZ5BF0QF4";

// Bricolage Grotesque carries the interface and headlines; Literata is a
// reading serif for the long-form guide text.
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const body = Literata({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#2A3FF0",
};

const BASE_URL = getBaseUrl();

const TAGLINE = "Ending Explained and Watch Order guides for movies and anime";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: `${SITE_NAME} — ${TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Spoiler-forward Ending Explained breakdowns for movies and anime, plus Watch Order guides for the right order to watch every franchise.",
  keywords: [
    "ending explained",
    "watch order",
    "movie ending explained",
    "anime ending explained",
    "franchise watch order",
    "movie recap",
    "anime recap",
  ],
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    siteName: SITE_NAME,
    type: "website",
    url: BASE_URL,
    title: `${SITE_NAME} — ${TAGLINE}`,
    description:
      "Spoiler-forward Ending Explained breakdowns for movies and anime, plus Watch Order guides for the right order to watch every franchise.",
    images: [
      {
        url: buildOgImageUrl({
          title: SITE_NAME,
          subtitle: TAGLINE,
          badge: "MARQUEE",
        }),
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — ${TAGLINE}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: [
      buildOgImageUrl({
        title: SITE_NAME,
        subtitle: TAGLINE,
        badge: "MARQUEE",
      }),
    ],
  },
  robots: {
    index: true,
    follow: true,
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: BASE_URL,
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: BASE_URL,
  potentialAction: {
    "@type": "SearchAction",
    target: `${BASE_URL}/search?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="font-display min-h-screen flex flex-col bg-paper text-ink antialiased">
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c") }}
        />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd).replace(/</g, "\\u003c") }}
        />
        {/* Google tag (gtag.js) — loaded with "lazyOnload" so its ~68 KiB
            downloads during browser idle time, after the page has finished
            loading, instead of racing the app's own JS on the critical
            path (this is what Lighthouse's "Reduce unused JavaScript" /
            "Legacy JavaScript" diagnostics were flagging). Analytics
            firing a beat later is imperceptible to users. */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="lazyOnload"
        />
        <Script id="ga4-init" strategy="lazyOnload">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
        <Nav />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
