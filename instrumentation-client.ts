import * as Sentry from "@sentry/nextjs";

// Client-side Sentry initialization. Runs before hydration so early errors are
// captured. No-ops when the DSN is absent.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});

// Lets Sentry instrument client-side router navigations.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
