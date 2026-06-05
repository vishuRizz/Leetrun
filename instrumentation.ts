import * as Sentry from "@sentry/nextjs";

// Server-side instrumentation entrypoint (Next.js). Loads the runtime-specific
// Sentry config once per server instance.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  } else if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Forwards server-side render/route/action errors to Sentry.
export const onRequestError = Sentry.captureRequestError;
