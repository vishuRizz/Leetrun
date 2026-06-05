import * as Sentry from "@sentry/nextjs";

// Server (Node.js runtime) Sentry initialization. No-ops gracefully when the
// DSN is not configured, so local/dev and missing-env builds are unaffected.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
