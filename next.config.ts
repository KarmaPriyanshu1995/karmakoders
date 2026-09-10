import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["172.20.10.2", "localhost"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "utfs.io",
      },
      {
        protocol: "https",
        hostname: "uploadthing.com",
      },
      {
        protocol: "https",
        hostname: "images.pexels.com",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "karmakoders.com" }],
        destination: "https://www.karmakoders.com/:path*",
        permanent: true,
      },
      // Canonical public URLs — old paths keep working; Google consolidates to one URL.
      // Admin routes like /admin/projects are NOT matched by these sources.
      {
        source: "/projects",
        destination: "/portfolio",
        permanent: true,
      },
      {
        source: "/contact-support",
        destination: "/contact",
        permanent: true,
      },
      // Specific GSC bad slug (exact path — do not use /blog/-:slug* ;
      // path-to-regexp rejects repeating params without a / prefix before :name)
      {
        source: "/blog/-to-build-a-saas-product-from-scratch-in-90-days",
        destination: "/blog/how-to-build-a-saas-product-from-scratch-in-90-days",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
