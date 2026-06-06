/**
 * Accounts allowed to access the admin area. Kept tiny and explicit on
 * purpose - admin access is gated server-side on every admin API route.
 */
export const ADMIN_EMAILS = new Set<string>(["vishurizz0@gmail.com"]);

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.has(email.trim().toLowerCase());
}
