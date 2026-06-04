import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { unstable_cache } from "next/cache";

/**
 * Public endpoint returning the total number of registered users. Used on the
 * landing page to show live signup momentum ("X already joined") and how many
 * of the first-200 free-Premium spots remain. Cached briefly since the exact
 * number doesn't need to be real-time.
 */
const getUserCount = unstable_cache(
  async () => db.user.count(),
  ["registered-user-count-v1"],
  { revalidate: 60, tags: ["user-count"] }
);

export async function GET() {
  try {
    const count = await getUserCount();
    const res = NextResponse.json({ count });
    res.headers.set(
      "Cache-Control",
      "public, max-age=60, stale-while-revalidate=300"
    );
    return res;
  } catch (error) {
    console.error("Error in /api/stats/users:", error);
    // Fail soft so the landing page promo can still render a sensible default.
    return NextResponse.json({ count: null }, { status: 200 });
  }
}
