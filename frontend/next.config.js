/** @type {import('next').NextConfig} */
// DEPLOYMENT NOTE: Set BACKEND_URL environment variable to your backend domain
// Example: BACKEND_URL=https://your-backend-domain.com
const nextConfig = {
  images: {
    domains: [
      "localhost",
      // Extract domain from BACKEND_URL environment variable
      ...(process.env.BACKEND_URL
        ? [new URL(process.env.BACKEND_URL).hostname]
        : []),
    ],
  },
  // Security headers following security-expert.md guidelines
  async headers() {
    // Environment-specific backend URLs for CSP - fully environment variable based
    // BACKEND_URL environment variable is REQUIRED for production deployments
    // Defaults to localhost:3001 for development only
    const backendUrl = process.env.BACKEND_URL || "http://localhost:3001"

    // Build connect-src directive with environment-specific URLs
    const isProduction = process.env.NODE_ENV === "production"
    const connectSrc = isProduction
      ? `'self' ${backendUrl}`
      : `'self' ${backendUrl} ws://localhost:3001`

    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
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
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self'",
              `connect-src ${connectSrc}`,
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ]
  },
  // Experimental features for security
  experimental: {
    serverComponentsExternalPackages: ["sharp", "canvas"],
  },
  // TypeScript configuration for build
  typescript: {
    // Dangerously allow production builds to successfully complete even if
    // your project has TypeScript errors.
    ignoreBuildErrors: true,
  },
  // ESLint configuration for build
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  // Webpack configuration for security
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }
    return config
  },
}

module.exports = nextConfig
