// Flyers live in R2 behind whatever hostname the bucket is published on —
// its r2.dev address or a custom domain — so the pattern is derived from the
// same env var the upload route hands back rather than hardcoding a bucket.
// Both buckets: production reads R2_PUBLIC_URL from wrangler vars, local dev
// from .env pointing at the preview bucket. Allowing both means one build works
// in either place.
const flyerHosts = [
  process.env.R2_PUBLIC_URL,
  process.env.R2_PUBLIC_URL_PREVIEW,
]
  .filter(Boolean)
  .map((value) => new URL(value).hostname);

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      ...flyerHosts.map((hostname) => ({
        protocol: "https",
        hostname,
        pathname: "/flyer/**",
      })),
      {
        protocol: "https",
        hostname: "picsum.photos",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "loremflickr.com",
        pathname: "/**",
      },
    ],
  },

  // Analytics ingest is proxied through our own origin, so requests do not go
  // to a hostname that most blocklists carry. skipTrailingSlashRedirect keeps
  // PostHog's api/ paths intact through the rewrite.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
};

export default nextConfig;
