import type { NextConfig } from "next";

const releaseHeaders: Array<{ key: string; value: string }> = [];

if (/^[0-9a-f]{40}$/i.test(process.env.APP_BUILD ?? "")) {
  releaseHeaders.push({ key: "X-Nexora-Build", value: process.env.APP_BUILD! });
}

if (/^[0-9a-f]{64}$/i.test(process.env.APP_ARTIFACT_SHA256 ?? "")) {
  releaseHeaders.push({
    key: "X-Nexora-Artifact",
    value: process.env.APP_ARTIFACT_SHA256!,
  });
}

if (/^(staging|production)$/.test(process.env.APP_ENVIRONMENT ?? "")) {
  releaseHeaders.push({ key: "X-Nexora-Environment", value: process.env.APP_ENVIRONMENT! });
}

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: process.cwd(),
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self';",
          },
          ...releaseHeaders,
        ],
      },
    ];
  },
};

export default nextConfig;
