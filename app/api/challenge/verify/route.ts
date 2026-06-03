import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  verifyQuest,
  setQuestProblemCompletion,
} from "@/lib/services/challenge";

/**
 * Verify / claim a quest, or manually toggle a single problem's completion.
 * Body:
 *   { userChallengeId, action: "verify" }
 *   { userChallengeId, action: "toggle", problemId, completed }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const userChallengeId =
      typeof body.userChallengeId === "string" ? body.userChallengeId : "";
    const action = body.action === "toggle" ? "toggle" : "verify";

    if (!userChallengeId) {
      return NextResponse.json(
        { error: "userChallengeId is required." },
        { status: 400 }
      );
    }

    if (action === "toggle") {
      const problemId =
        typeof body.problemId === "string" ? body.problemId : "";
      if (!problemId) {
        return NextResponse.json(
          { error: "problemId is required for toggle." },
          { status: 400 }
        );
      }
      const result = await setQuestProblemCompletion(
        user.id,
        userChallengeId,
        problemId,
        Boolean(body.completed)
      );
      return NextResponse.json({ success: true, ...result });
    }

    const result = await verifyQuest(user.id, userChallengeId);

    let message: string;
    if (result.status === "COMPLETED" && result.xpAwarded > 0) {
      message = `Quest complete! +${result.xpAwarded} XP claimed.`;
    } else if (result.newlyVerified > 0) {
      message = `Verified ${result.newlyVerified} problem${
        result.newlyVerified === 1 ? "" : "s"
      }. Keep going!`;
    } else if (result.status === "COMPLETED") {
      message = "Quest already completed.";
    } else {
      message =
        "No new solved problems found yet. Solve them on LeetCode, then verify again.";
    }

    return NextResponse.json({ success: true, message, ...result });
  } catch (error: any) {
    console.error("Error in /api/challenge/verify POST:", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify quest." },
      { status: 500 }
    );
  }
}
