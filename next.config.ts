import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Clickjacking: no route may be framed. Only frame-ancestors for now; the full CSP comes with
  // the security hardening step.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
];

/** Signer link + signer pages: never indexed, never cached, never leak the URL via Referer. */
const signerHeaders = [
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  { key: "Cache-Control", value: "no-store" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: ["172.20.10.2", "localhost"],
  transpilePackages: ["mermaid"],
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
      {
        source: "/k.js",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
      },
      // Signer links carry a bearer token in the URL, and signer pages show a signer's
      // document. Must stay after "/:path*" so they override the global Referrer-Policy
      // (last matching header wins).
      {
        source: "/tools/sign/s/:path*",
        headers: signerHeaders,
      },
      {
        source: "/tools/sign/sign",
        headers: signerHeaders,
      },
      {
        source: "/tools/sign/sign/:path*",
        headers: signerHeaders,
      },
    ];
  },
};

export default nextConfig;
