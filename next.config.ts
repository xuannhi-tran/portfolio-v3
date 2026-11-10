import type { NextConfig } from "next";

/** Sent with every page and API response. */
const securityHeaders = [
  // no other site may show this one inside a frame (clickjacking)
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  // browsers must trust the declared content type, not guess it
  { key: "X-Content-Type-Options", value: "nosniff" },
  // other sites see only the domain, never the full URL
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // the site never needs these, so nothing on it can ask for them
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
