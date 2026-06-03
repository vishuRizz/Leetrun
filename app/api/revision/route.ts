import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getRevisionTopics,
  getSolvedSlugSet,
  generateConfigurableRevision,
  type RevisionConfig,
  type RevisionSolvedFilter,
} from "@/lib/services/challenge";

const DIFFICULTIES = ["EASY", "MEDIUM", "HARD", "ANY"] as const;
const SOLVED_FILTERS: RevisionSolvedFilter[] = ["any", "solved", "unsolved"];

/** Return the options the revision configurator needs. */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const solved = await getSolvedSlugSet(user.id);

    return NextResponse.json({
      topics: getRevisionTopics(),
      difficulties: DIFFICULTIES,
      solvedCount: solved.size,
      hasSolveData: solved.size > 0,
    });
  } catch (error: any) {
    console.error("Error in /api/revision GET:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load revision options." },
      { status: 500 }
    );
  }
}

/** Generate a random revision quest from a configuration. */
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

    const topics = Array.isArray(body.topics)
      ? body.topics.filter((t: unknown): t is string => typeof t === "string")
      : [];

    const difficulty = (DIFFICULTIES as readonly string[]).includes(
      body.difficulty
    )
      ? body.difficulty
      : "ANY";

    const solvedFilter: RevisionSolvedFilter = SOLVED_FILTERS.includes(
      body.solvedFilter
    )
      ? body.solvedFilter
      : "any";

    const count =
      typeof body.count === "number" && Number.isFinite(body.count)
        ? body.count
        : 1;

    const config: RevisionConfig = {
      topics,
      difficulty: difficulty as RevisionConfig["difficulty"],
      solvedFilter,
      count,
    };

    const result = await generateConfigurableRevision(user.id, config);

    return NextResponse.json({
      success: true,
      userChallengeId: result.userChallenge.id,
      matchCount: result.matchCount,
      xpReward: result.xpReward,
    });
  } catch (error: any) {
    console.error("Error in /api/revision POST:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate revision." },
      { status: 400 }
    );
  }
}
