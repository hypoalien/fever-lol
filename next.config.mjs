// Flyers live in R2 behind whatever hostname the bucket is published on —
// its r2.dev address or a custom domain — so the pattern is derived from the
// same env var the upload route hands back rather than hardcoding a bucket.
const flyerHost = process.env.R2_PUBLIC_URL
  ? new URL(process.env.R2_PUBLIC_URL).hostname
  : undefined;

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      ...(flyerHost
        ? [{ protocol: "https", hostname: flyerHost, pathname: "/flyer/**" }]
        : []),
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
