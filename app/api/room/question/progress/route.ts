import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  claimRoomQuestion,
  verifyRoomQuestion,
  markRoomQuestionPreSolved,
  resetRoomQuestionProgress,
} from "@/lib/services/room";

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
    const { roomChallengeId, action } = body || {};

    if (!roomChallengeId || typeof roomChallengeId !== "string") {
      return NextResponse.json(
        { error: "roomChallengeId is required." },
        { status: 400 }
      );
    }

    switch (action) {
      case "claim": {
        const progress = await claimRoomQuestion(user.id, roomChallengeId);
        return NextResponse.json({ success: true, progress });
      }
      case "verify": {
        const result = await verifyRoomQuestion(user.id, roomChallengeId);
        return NextResponse.json({ success: true, ...result });
      }
      case "preSolved":
      case "alreadySolved": {
        const progress = await markRoomQuestionPreSolved(
          user.id,
          roomChallengeId
        );
        return NextResponse.json({ success: true, progress });
      }
      case "reset":
      case "undo": {
        const progress = await resetRoomQuestionProgress(
          user.id,
          roomChallengeId
        );
        return NextResponse.json({ success: true, progress });
      }
      default:
        return NextResponse.json(
          { error: "Unknown action. Use claim | verify | preSolved | reset." },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error("Error in /api/room/question/progress:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update progress." },
      { status: 400 }
    );
  }
}
