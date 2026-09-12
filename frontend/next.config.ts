import type { NextConfig } from "next";

const configuredPublicApiUrl =
  process.env.NEXT_PUBLIC_API_URL?.trim();

if (
  process.env.NODE_ENV === "production" &&
  !configuredPublicApiUrl
) {
  throw new Error(
    "NEXT_PUBLIC_API_URL is required for a production HireALocals build."
  );
}

const browserApiOrigin = (
  configuredPublicApiUrl ||
  "http://127.0.0.1:8000"
).replace(/\/$/, "");

const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff"
  },
  {
    key: "X-Frame-Options",
    value: "DENY"
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin"
  },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(self)"
  },
  ...(process.env.NODE_ENV === "production"
    ? [{
        key: "Strict-Transport-Security",
        value:
          "max-age=31536000; includeSubDomains"
      }]
    : [])
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  output: "standalone",

  allowedDevOrigins: [
    "192.168.1.2",
    "192.168.1.7"
  ],

  async headers() {
    return [{
      source: "/(.*)",
      headers: securityHeaders
    }];
  },

  async rewrites() {
    if (
      process.env.NODE_ENV !== "development"
    ) {
      return [];
    }

    return [{
      source: "/hal-api/:path*",
      destination:
        `${browserApiOrigin}/:path*`
    }];
  }
};

export default nextConfig;
