import { db } from "@/lib/db";
import { PROBLEM_BANK } from "../constants/problems";
import { ChallengeType, Difficulty } from "@prisma/client";
import { syncUserProfile } from "@/lib/leetcode/service";

// Helper to generate a unique 6-character alphanumeric room code
function generateRoomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function createChallengeRoom(userId: string, name: string) {
  let roomCode = generateRoomCode();

  // Retry if code collision exists
  let exists = await db.challengeRoom.findUnique({ where: { roomCode } });
  while (exists) {
    roomCode = generateRoomCode();
    exists = await db.challengeRoom.findUnique({ where: { roomCode } });
  }

  return await db.$transaction(async (tx) => {
    const room = await tx.challengeRoom.create({
      data: {
        name,
        roomCode,
        creatorId: userId,
      },
    });

    // Automatically join creator as member
    await tx.roomMember.create({
      data: {
        roomId: room.id,
        userId,
      },
    });

    return room;
  });
}

export async function joinChallengeRoom(userId: string, roomCode: string) {
  const code = roomCode.trim().toUpperCase();

  const room = await db.challengeRoom.findUnique({
    where: { roomCode: code },
    include: { members: true },
  });

  if (!room) {
    throw new Error("Lobby not found. Verify room code.");
  }

  const isMember = room.members.some((m) => m.userId === userId);
  if (isMember) {
    return room; // Already a member
  }

  await db.roomMember.create({
    data: {
      roomId: room.id,
      userId,
    },
  });

  // Backfill progress rows for all existing room challenges so the new
  // member can immediately see and act on them.
  const existingChallenges = await db.roomChallenge.findMany({
    where: { roomId: room.id },
    select: { id: true },
  });
  if (existingChallenges.length > 0) {
    await db.roomChallengeProgress.createMany({
      data: existingChallenges.map((rc) => ({
        roomChallengeId: rc.id,
        userId,
        completed: false,
      })),
      skipDuplicates: true,
    });
  }

  return room;
}

export async function leaveChallengeRoom(userId: string, roomId: string) {
  const room = await db.challengeRoom.findUnique({
    where: { id: roomId },
  });

  if (!room) throw new Error("Lobby not found.");

  if (room.creatorId === userId) {
    // If creator leaves, we delete the room and cascade-delete members
    return await db.challengeRoom.delete({
      where: { id: roomId },
    });
  }

  return await db.roomMember.deleteMany({
    where: {
      roomId,
      userId,
    },
  });
}

export async function createRoomChallenge(
  userId: string,
  roomId: string,
  topic: string,
  difficulty: "EASY" | "MEDIUM" | "HARD",
  count: number,
  deadlineHours: number = 24
) {
  const room = await db.challengeRoom.findUnique({
    where: { id: roomId },
    include: { members: true },
  });

  if (!room) throw new Error("Lobby not found.");
  if (room.creatorId !== userId) {
    throw new Error("Only the room host can generate custom challenges.");
  }

  // Filter candidates matching parameters
  const candidates = PROBLEM_BANK.filter((p) => p.topic === topic && p.difficulty === difficulty);
  if (candidates.length === 0) {
    throw new Error(`No matching problems found for ${topic} (${difficulty}).`);
  }

  // Shuffle and pick up to 'count' questions
  const selected = candidates.sort(() => 0.5 - Math.random()).slice(0, count);

  return await db.$transaction(async (tx) => {
    // Create base challenge
    const challenge = await tx.challenge.create({
      data: {
        title: `Lobby Challenge: ${topic}`,
        description: `Solve room-host assigned questions before deadline.`,
        type: ChallengeType.FRIEND,
        difficulty,
        xpReward: count * 20 + 20,
        problems: {
          create: selected.map((p) => ({
            problemName: p.name,
            problemSlug: p.slug,
            difficulty: p.difficulty,
            topic: p.topic,
          })),
        },
      },
    });

    const deadline = new Date(Date.now() + deadlineHours * 60 * 60 * 1000);

    // Create room challenge link
    const rc = await tx.roomChallenge.create({
      data: {
        roomId,
        challengeId: challenge.id,
        deadline,
      },
    });

    // Populate active challenge progress for all members
    await tx.roomChallengeProgress.createMany({
      data: room.members.map((m) => ({
        roomChallengeId: rc.id,
        userId: m.userId,
        completed: false,
      })),
    });

    return rc;
  });
}

export async function verifyRoomChallengeCompletion(userId: string, roomId: string) {
  // Auto-verify only applies to bulk/bank-generated room challenges.
  // Host-added single questions require an explicit click → see verifyRoomQuestion.
  const activeRoomChallenges = await db.roomChallenge.findMany({
    where: { roomId, isHostQuestion: false },
    include: {
      challenge: {
        include: {
          problems: true,
        },
      },
      progress: {
        where: { userId },
      },
    },
  });

  if (activeRoomChallenges.length === 0) return { verifiedCount: 0 };

  // Fetch recent user submissions
  const profile = await db.leetcodeProfile.findUnique({
    where: { userId },
    include: { submissions: true },
  });

  if (!profile) return { verifiedCount: 0 };

  const solvedSlugs = new Set(profile.submissions.map((s) => s.slug));
  let verifiedCount = 0;

  for (const rc of activeRoomChallenges) {
    const userProgress = rc.progress[0];
    if (userProgress?.completed) continue;

    const problems = rc.challenge.problems;
    const allSolved = problems.every((p) => solvedSlugs.has(p.problemSlug));

    if (allSolved) {
      await db.$transaction(async (tx) => {
        // Mark room challenge progress as completed
        await tx.roomChallengeProgress.update({
          where: {
            roomChallengeId_userId: {
              roomChallengeId: rc.id,
              userId,
            },
          },
          data: {
            completed: true,
            completedAt: new Date(),
          },
        });

        // Award XP
        const { awardXp } = await import("./progression");
        await awardXp(userId, rc.challenge.xpReward, `Completed Lobby Challenge: ${rc.challenge.title}`);
      });
      verifiedCount++;
    }
  }

  return { verifiedCount };
}

export async function sendRoomInvite(senderId: string, receiverId: string, roomId: string) {
  // Check if receiver is already a member
  const member = await db.roomMember.findFirst({
    where: { roomId, userId: receiverId },
  });
  if (member) throw new Error("User is already a member of this lobby.");

  // Check if invite already exists
  const existing = await db.roomInvite.findFirst({
    where: { roomId, senderId, receiverId, accepted: false },
  });
  if (existing) throw new Error("Room invitation already sent to this user.");

  return await db.roomInvite.create({
    data: {
      roomId,
      senderId,
      receiverId,
      accepted: false,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Host-added LeetCode questions
// ─────────────────────────────────────────────────────────────────────────────

const HOST_QUESTION_XP: Record<Difficulty, number> = {
  EASY: 20,
  MEDIUM: 40,
  HARD: 80,
};

/**
 * Parse a LeetCode problem URL or raw slug and return its slug.
 * Accepts:
 *   - https://leetcode.com/problems/two-sum/
 *   - https://leetcode.com/problems/two-sum/description/
 *   - https://leetcode.com/problems/valid-anagram/
 *   - leetcode.com/problems/two-sum
 *   - two-sum
 *
 * NB: the URL branch must match first; otherwise the original regex
 * would greedily match "https" out of the protocol prefix.
 */
export function parseLeetCodeSlug(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  // 1. Prefer the URL-anchored match — this is the common case.
  const urlMatch = trimmed.match(
    /leetcode\.com\/problems\/([a-z0-9][a-z0-9-]*)/i
  );
  if (urlMatch) return urlMatch[1].toLowerCase();

  // 2. If the user typed *anything* that looks URL-ish (has a slash, colon,
  //    or a dot followed by letters) but didn't match the URL pattern above,
  //    reject it — otherwise we'd happily accept "https" as a slug.
  if (/[\/:]/.test(trimmed) || /\.[a-z]/i.test(trimmed)) return null;

  // 3. Otherwise, accept ONLY if the entire input is itself a clean slug.
  if (/^[a-z0-9][a-z0-9-]*$/i.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  return null;
}

function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Host adds a single LeetCode question to the lobby.
 * Creates a 1-problem Challenge + RoomChallenge + RoomChallengeProgress rows
 * for every current member.
 */
export async function createHostQuestion(
  userId: string,
  roomId: string,
  params: {
    url: string;
    problemName?: string;
    problemNumber?: number;
    difficulty: Difficulty;
    topic?: string;
    deadlineHours?: number;
  }
) {
  const room = await db.challengeRoom.findUnique({
    where: { id: roomId },
    include: { members: true },
  });

  if (!room) throw new Error("Lobby not found.");
  if (room.creatorId !== userId) {
    throw new Error("Only the lobby host can add questions.");
  }

  const slug = parseLeetCodeSlug(params.url);
  if (!slug) {
    throw new Error("Couldn't parse a LeetCode problem from that URL or slug.");
  }

  const problemName =
    params.problemName?.trim() || titleFromSlug(slug);
  const topic = params.topic?.trim() || "General";
  const difficulty = params.difficulty;
  const xpReward = HOST_QUESTION_XP[difficulty] || 20;
  const deadline = params.deadlineHours
    ? new Date(Date.now() + params.deadlineHours * 60 * 60 * 1000)
    : null;

  return await db.$transaction(async (tx) => {
    const challenge = await tx.challenge.create({
      data: {
        title: problemName,
        description: `Host-picked LeetCode question. Solve it, then click Verify to claim XP.`,
        type: ChallengeType.FRIEND,
        difficulty,
        xpReward,
        problems: {
          create: [
            {
              problemName,
              problemSlug: slug,
              difficulty,
              topic,
            },
          ],
        },
      },
    });

    const rc = await tx.roomChallenge.create({
      data: {
        roomId,
        challengeId: challenge.id,
        deadline: deadline ?? undefined,
        isHostQuestion: true,
        problemNumber:
          typeof params.problemNumber === "number" && params.problemNumber > 0
            ? params.problemNumber
            : null,
      },
    });

    if (room.members.length > 0) {
      await tx.roomChallengeProgress.createMany({
        data: room.members.map((m) => ({
          roomChallengeId: rc.id,
          userId: m.userId,
          completed: false,
        })),
        skipDuplicates: true,
      });
    }

    return rc;
  });
}

/**
 * User claims they've solved the question. Sets `claimed` and a timestamp,
 * but does NOT award XP until verification succeeds.
 */
export async function claimRoomQuestion(userId: string, roomChallengeId: string) {
  const rc = await db.roomChallenge.findUnique({
    where: { id: roomChallengeId },
    include: { room: { include: { members: true } } },
  });
  if (!rc) throw new Error("Room challenge not found.");
  const isMember = rc.room.members.some((m) => m.userId === userId);
  if (!isMember) throw new Error("You are not a member of this lobby.");

  return await db.roomChallengeProgress.upsert({
    where: {
      roomChallengeId_userId: { roomChallengeId, userId },
    },
    update: {
      claimed: true,
      claimedAt: new Date(),
    },
    create: {
      roomChallengeId,
      userId,
      claimed: true,
      claimedAt: new Date(),
    },
  });
}

/**
 * Re-sync LeetCode submissions (cooldown-aware) and verify the user actually
 * solved every problem in this room challenge. If yes, mark verified +
 * completed and award XP exactly once.
 */
export async function verifyRoomQuestion(userId: string, roomChallengeId: string) {
  const rc = await db.roomChallenge.findUnique({
    where: { id: roomChallengeId },
    include: {
      room: { include: { members: true } },
      challenge: { include: { problems: true } },
    },
  });
  if (!rc) throw new Error("Room challenge not found.");
  const isMember = rc.room.members.some((m) => m.userId === userId);
  if (!isMember) throw new Error("You are not a member of this lobby.");

  // Already done? Don't redo XP.
  const existing = await db.roomChallengeProgress.findUnique({
    where: { roomChallengeId_userId: { roomChallengeId, userId } },
  });
  if (existing?.verified) {
    return { verified: true, alreadyAwarded: true, xpAwarded: existing.xpAwarded };
  }
  if (existing?.markedPreSolved) {
    return { verified: false, alreadyDone: true, reason: "preSolved" };
  }

  // Pull fresh LeetCode submissions (debounced via service-level cooldown).
  const profile = await db.leetcodeProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw new Error("Link your LeetCode profile first to verify questions.");
  }
  try {
    await syncUserProfile(userId, profile.username);
  } catch (err) {
    console.warn("LeetCode sync during room verify failed (continuing):", err);
  }

  const subs = await db.leetcodeSubmission.findMany({
    where: { profile: { userId } },
    select: { slug: true },
  });
  const solvedSlugs = new Set(subs.map((s) => s.slug));

  const allSolved = rc.challenge.problems.every((p) => solvedSlugs.has(p.problemSlug));
  if (!allSolved) {
    return { verified: false, reason: "notFoundInSubmissions" };
  }

  const xp = rc.challenge.xpReward || 0;
  await db.$transaction(async (tx) => {
    await tx.roomChallengeProgress.upsert({
      where: { roomChallengeId_userId: { roomChallengeId, userId } },
      update: {
        claimed: true,
        completed: true,
        completedAt: new Date(),
        verified: true,
        verifiedAt: new Date(),
        xpAwarded: xp,
      },
      create: {
        roomChallengeId,
        userId,
        claimed: true,
        completed: true,
        completedAt: new Date(),
        verified: true,
        verifiedAt: new Date(),
        xpAwarded: xp,
      },
    });

    const { awardXp } = await import("./progression");
    await awardXp(
      userId,
      xp,
      `Lobby question verified: ${rc.challenge.title}`
    );
  });

  return { verified: true, xpAwarded: xp };
}

/**
 * User wants to change their previous answer (Done / Verified / Already solved).
 * Resets every state flag on their progress row to a fresh "not started".
 *
 * Note: any XP that was already awarded via the global XPLog stream stays in
 * the audit log, but the in-lobby `xpAwarded` is cleared so the lobby
 * leaderboard reflects the reset immediately. To prevent re-claiming, the
 * row stays in place (just blanked out) — `verifyRoomQuestion` will treat
 * this as a fresh attempt.
 */
export async function resetRoomQuestionProgress(
  userId: string,
  roomChallengeId: string
) {
  const rc = await db.roomChallenge.findUnique({
    where: { id: roomChallengeId },
    include: { room: { include: { members: true } } },
  });
  if (!rc) throw new Error("Room challenge not found.");
  const isMember = rc.room.members.some((m) => m.userId === userId);
  if (!isMember) throw new Error("You are not a member of this lobby.");

  return await db.roomChallengeProgress.upsert({
    where: { roomChallengeId_userId: { roomChallengeId, userId } },
    update: {
      claimed: false,
      claimedAt: null,
      verified: false,
      verifiedAt: null,
      markedPreSolved: false,
      completed: false,
      completedAt: null,
      xpAwarded: 0,
    },
    create: {
      roomChallengeId,
      userId,
      completed: false,
    },
  });
}

/**
 * Host removes a question (RoomChallenge) from the lobby entirely. Cascades
 * delete every member's progress row and the underlying Challenge.
 */
export async function deleteRoomQuestion(
  userId: string,
  roomChallengeId: string
) {
  const rc = await db.roomChallenge.findUnique({
    where: { id: roomChallengeId },
    include: {
      room: { select: { creatorId: true } },
    },
  });
  if (!rc) throw new Error("Room challenge not found.");
  if (rc.room.creatorId !== userId) {
    throw new Error("Only the lobby host can remove questions.");
  }

  // Host questions are 1:1 with their Challenge row, so deleting the
  // underlying Challenge cascades through RoomChallenge → RoomChallengeProgress.
  // Guard with `isHostQuestion` so we never nuke a bank-generated challenge.
  if (!rc.isHostQuestion) {
    throw new Error("Bank-generated challenges cannot be deleted.");
  }
  await db.challenge.delete({ where: { id: rc.challengeId } });

  return { success: true };
}

/**
 * User self-reports they had already solved this question before joining the
 * lobby. We mark it done but DO NOT award XP.
 */
export async function markRoomQuestionPreSolved(userId: string, roomChallengeId: string) {
  const rc = await db.roomChallenge.findUnique({
    where: { id: roomChallengeId },
    include: { room: { include: { members: true } } },
  });
  if (!rc) throw new Error("Room challenge not found.");
  const isMember = rc.room.members.some((m) => m.userId === userId);
  if (!isMember) throw new Error("You are not a member of this lobby.");

  return await db.roomChallengeProgress.upsert({
    where: { roomChallengeId_userId: { roomChallengeId, userId } },
    update: {
      markedPreSolved: true,
      completed: true,
      completedAt: new Date(),
      xpAwarded: 0,
    },
    create: {
      roomChallengeId,
      userId,
      markedPreSolved: true,
      completed: true,
      completedAt: new Date(),
      xpAwarded: 0,
    },
  });
}

/**
 * Aggregate per-lobby leaderboard: total XP earned in-room, verified count,
 * pre-solved count, and last activity timestamp.
 */
export async function getLobbyLeaderboard(roomId: string) {
  const room = await db.challengeRoom.findUnique({
    where: { id: roomId },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              currentStreak: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });
  if (!room) throw new Error("Lobby not found.");

  // Pull every progress row for the lobby in one shot.
  const progress = await db.roomChallengeProgress.findMany({
    where: {
      roomChallenge: { roomId },
    },
    select: {
      userId: true,
      xpAwarded: true,
      verified: true,
      markedPreSolved: true,
      completed: true,
      completedAt: true,
    },
  });

  type Row = {
    userId: string;
    fullName: string | null;
    email: string;
    avatarUrl: string | null;
    currentStreak: number;
    isHost: boolean;
    xp: number;
    verified: number;
    preSolved: number;
    solved: number;
    lastActivity: Date | null;
  };

  const rows: Record<string, Row> = {};
  for (const m of room.members) {
    rows[m.user.id] = {
      userId: m.user.id,
      fullName: m.user.fullName,
      email: m.user.email,
      avatarUrl: m.user.avatarUrl,
      currentStreak: m.user.currentStreak,
      isHost: m.user.id === room.creatorId,
      xp: 0,
      verified: 0,
      preSolved: 0,
      solved: 0,
      lastActivity: null,
    };
  }

  for (const p of progress) {
    const row = rows[p.userId];
    if (!row) continue;
    row.xp += p.xpAwarded || 0;
    if (p.verified) row.verified += 1;
    if (p.markedPreSolved) row.preSolved += 1;
    if (p.completed) row.solved += 1;
    if (p.completedAt) {
      if (!row.lastActivity || p.completedAt > row.lastActivity) {
        row.lastActivity = p.completedAt;
      }
    }
  }

  const ranked = Object.values(rows).sort((a, b) => {
    if (b.xp !== a.xp) return b.xp - a.xp;
    if (b.verified !== a.verified) return b.verified - a.verified;
    return b.solved - a.solved;
  });

  return ranked.map((r, idx) => ({ ...r, rank: idx + 1 }));
}

export async function respondToRoomInvite(userId: string, inviteId: string, accept: boolean) {
  const invite = await db.roomInvite.findUnique({
    where: { id: inviteId },
  });

  if (!invite) throw new Error("Invitation not found.");
  if (invite.receiverId !== userId) throw new Error("Unauthorized.");

  if (accept) {
    return await db.$transaction(async (tx) => {
      // 1. Add member
      await tx.roomMember.create({
        data: {
          roomId: invite.roomId,
          userId,
        },
      });

      // 2. Backfill progress rows for any existing lobby questions/challenges.
      const existingChallenges = await tx.roomChallenge.findMany({
        where: { roomId: invite.roomId },
        select: { id: true },
      });
      if (existingChallenges.length > 0) {
        await tx.roomChallengeProgress.createMany({
          data: existingChallenges.map((rc) => ({
            roomChallengeId: rc.id,
            userId,
            completed: false,
          })),
          skipDuplicates: true,
        });
      }

      // 3. Consume the invite
      await tx.roomInvite.delete({
        where: { id: inviteId },
      });

      return { roomId: invite.roomId };
    });
  } else {
    return await db.roomInvite.delete({
      where: { id: inviteId },
    });
  }
}

