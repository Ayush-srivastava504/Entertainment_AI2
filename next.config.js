/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Streaming metadata puts <title>/<meta> in <body> for normal browsers.
  // For these crawlers (and link-preview bots) Next waits for metadata and
  // writes it into <head>, which is the safest form for indexing. Googlebot
  // and Bingbot are listed explicitly so they always get a real <head>.
  htmlLimitedBots:
    /Googlebot|Google-InspectionTool|Storebot-Google|GoogleOther|Bingbot|BingPreview|msnbot|AdIdxBot|DuckDuckBot|Slurp|YandexBot|Baiduspider|Applebot|facebookexternalhit|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|redditbot|Mediapartners-Google/i,
  experimental: {
    // Inlines the CSS actually needed for above-the-fold content directly
    // into the HTML and loads the rest of the stylesheet asynchronously,
    // so the <link rel="stylesheet"> is no longer a render-blocking
    // request (this is what Lighthouse's "Render-blocking requests"
    // diagnostic was flagging). Requires the `critters` package below.
    optimizeCss: true,
  },
  // Set to 'export' only if you deploy the static build to Cloudflare Pages / Netlify
  // WITHOUT using Next's Node/Edge runtime for /app/api routes (see README:
  // "Deploying without a Node server").
  // output: 'export',

  // One host only. GSC crawl stats show ~1,600 requests going to
  // www.marquees.site vs ~120 to marquees.site: every www hit is a wasted
  // redirect. Also set marquees.site as the primary domain in Vercel
  // (Settings -> Domains) so the redirect happens at the edge.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.marquees.site" }],
        destination: "https://marquees.site/:path*",
        permanent: true,
      },
    ];
  },

  async headers() {
    return [
      {
        // Applies to every route, including /api/*.
        source: "/:path*",
        headers: [
          // Prevents this site from being embedded in an iframe elsewhere
          // (clickjacking protection).
          { key: "X-Frame-Options", value: "DENY" },
          // Stops browsers from MIME-sniffing a response away from its
          // declared Content-Type.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Don't leak the full referring URL (which may contain a
          // search query or other detail) to third-party origins.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Disable browser features this site never uses.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // Force HTTPS on repeat visits once you're confident TLS is
          // always available (Vercel terminates TLS by default).
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
