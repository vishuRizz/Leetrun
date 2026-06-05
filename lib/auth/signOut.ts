import { createClient } from "@/lib/supabase/client";
import { clearClientCache } from "@/lib/cache/clientCache";

/**
 * Sign the current user out: clears cached per-account data so the next user on
 * this browser never sees stale info, drops the server session, then redirects
 * to the login screen. Safe to call from any client component.
 */
export async function signOutAndRedirect(): Promise<void> {
  clearClientCache();
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  } catch {
    /* continue with client cleanup */
  }
  try {
    await createClient().auth.signOut({ scope: "local" });
  } catch {
    /* ignore */
  }
  window.location.href = "/login";
}
