import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: false,
    serverComponentsExternalPackages: ["@react-pdf/renderer"],
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  // Suppresses source map uploading logs during build.
  silent: true,

  // No auth token configured here — source-map upload is skipped (no-ops) rather than failing the build.
  // Set SENTRY_ORG / SENTRY_PROJECT / SENTRY_AUTH_TOKEN in the environment to enable uploads.

  // Upload a larger set of source maps for prettier stack traces (increases build time).
  widenClientFileUpload: true,

  // Automatically tree-shake Sentry logger statements to reduce bundle size.
  disableLogger: true,
});
