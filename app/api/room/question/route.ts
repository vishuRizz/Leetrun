import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createHostQuestion, deleteRoomQuestion } from "@/lib/services/room";
import { Difficulty } from "@prisma/client";

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
    const {
      roomId,
      url,
      problemName,
      problemNumber,
      difficulty,
      topic,
      deadlineHours,
    } = body || {};

    if (!roomId || typeof roomId !== "string") {
      return NextResponse.json(
        { error: "roomId is required." },
        { status: 400 }
      );
    }
    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "LeetCode URL or slug is required." },
        { status: 400 }
      );
    }
    const diff = String(difficulty || "").toUpperCase() as Difficulty;
    if (!["EASY", "MEDIUM", "HARD"].includes(diff)) {
      return NextResponse.json(
        { error: "Difficulty must be EASY, MEDIUM, or HARD." },
        { status: 400 }
      );
    }

    const challenge = await createHostQuestion(user.id, roomId, {
      url,
      problemName: problemName?.toString(),
      problemNumber:
        typeof problemNumber === "number"
          ? problemNumber
          : problemNumber
          ? Number(problemNumber)
          : undefined,
      difficulty: diff,
      topic: topic?.toString(),
      deadlineHours:
        typeof deadlineHours === "number" ? deadlineHours : undefined,
    });

    return NextResponse.json({ success: true, challenge });
  } catch (error: any) {
    console.error("Error in /api/room/question:", error);
    return NextResponse.json(
      { error: error.message || "Failed to add question." },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const roomChallengeId = searchParams.get("roomChallengeId");
    if (!roomChallengeId) {
      return NextResponse.json(
        { error: "roomChallengeId is required." },
        { status: 400 }
      );
    }

    const result = await deleteRoomQuestion(user.id, roomChallengeId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in DELETE /api/room/question:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete question." },
      { status: 400 }
    );
  }
}
