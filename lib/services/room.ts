import { db } from "@/lib/db";
import { PROBLEM_BANK } from "../constants/problems";
import { ChallengeType } from "@prisma/client";

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
  // Fetch active room challenges for this room
  const activeRoomChallenges = await db.roomChallenge.findMany({
    where: { roomId },
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

export async function respondToRoomInvite(userId: string, inviteId: string, accept: boolean) {
  const invite = await db.roomInvite.findUnique({
    where: { id: inviteId },
  });

  if (!invite) throw new Error("Invitation not found.");
  if (invite.receiverId !== userId) throw new Error("Unauthorized.");

  if (accept) {
    return await db.$transaction(async (tx) => {
      // 1. Mark invite accepted and delete it to avoid duplicates
      await tx.roomMember.create({
        data: {
          roomId: invite.roomId,
          userId,
        },
      });

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

