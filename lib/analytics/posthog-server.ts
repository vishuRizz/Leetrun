import { PostHog } from "posthog-node";

/**
 * Server-side PostHog client for forwarding key product events (signup,
 * onboarding, subscription, etc.) so funnels/retention/activation dashboards
 * reflect real backend state - not just client autocapture. No-ops when no key
 * is configured.
 */
let client: PostHog | null = null;

function getClient(): PostHog | null {
  const key = process.env.POSTHOG_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;
  if (!client) {
    client = new PostHog(key, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      // Send immediately - we're in short-lived serverless functions.
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return client;
}

export async function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>
): Promise<void> {
  const c = getClient();
  if (!c || !distinctId) return;
  try {
    c.capture({ distinctId, event, properties });
    await c.flush();
  } catch (err) {
    console.warn("PostHog server capture failed:", err);
  }
}
