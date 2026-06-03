export interface LeetcodeCookieAuth {
  session: string;
  csrfToken: string;
  cookieHeader: string;
}

/** Parse a pasted LeetCode cookie string or raw LEETCODE_SESSION value. */
export function parseLeetcodeCookie(raw: string): LeetcodeCookieAuth {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Paste your LeetCode session cookie to continue.");
  }

  // Raw session token only (no key=value pairs).
  if (!trimmed.includes("=") && !trimmed.includes(";")) {
    return {
      session: trimmed,
      csrfToken: "",
      cookieHeader: `LEETCODE_SESSION=${trimmed}`,
    };
  }

  const parts: Record<string, string> = {};
  for (const segment of trimmed.split(";")) {
    const eq = segment.indexOf("=");
    if (eq === -1) continue;
    const key = segment.slice(0, eq).trim();
    const value = segment.slice(eq + 1).trim();
    if (key) parts[key] = value;
  }

  const session = parts.LEETCODE_SESSION || "";
  const csrfToken = parts.csrftoken || parts.CSRFTOKEN || "";

  if (!session) {
    throw new Error(
      "Could not find LEETCODE_SESSION. Copy the full cookie from leetcode.com or paste just the session value."
    );
  }

  const cookieHeader = csrfToken
    ? `LEETCODE_SESSION=${session}; csrftoken=${csrfToken}`
    : `LEETCODE_SESSION=${session}`;

  return { session, csrfToken, cookieHeader };
}

/** Rebuild auth headers from a stored cookie header string. */
export function authFromStoredCookie(stored: string): LeetcodeCookieAuth {
  return parseLeetcodeCookie(stored);
}
