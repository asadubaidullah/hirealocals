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
    value: "camera=(), microphone=(), geolocation=(self)"
  },
  ...(process.env.NODE_ENV === "production"
    ? [{
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains"
      }]
    : [])
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  output: "standalone",

  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
    deviceSizes: [375, 390, 412, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  allowedDevOrigins: [
    "192.168.1.2",
    "192.168.1.7"
  ],

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders
      },
      {
        source: "/images/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable"
          }
        ]
      }
    ];
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
