import { db } from "@/lib/db";

export async function sendFriendRequest(requesterId: string, receiverEmail: string) {
  const email = receiverEmail.trim().toLowerCase();

  const receiver = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!receiver) {
    throw new Error("No user registered with this email address.");
  }

  if (receiver.id === requesterId) {
    throw new Error("You cannot add yourself as a friend.");
  }

  // Check if friendship already exists
  const existing = await db.friendship.findFirst({
    where: {
      OR: [
        { requesterId, receiverId: receiver.id },
        { requesterId: receiver.id, receiverId: requesterId },
      ],
    },
  });

  if (existing) {
    if (existing.accepted) {
      throw new Error("You are already friends with this user.");
    } else if (existing.requesterId === requesterId) {
      throw new Error("Friend request already sent.");
    } else {
      // If the other user sent a request first, accept it automatically
      return await db.friendship.update({
        where: { id: existing.id },
        data: { accepted: true },
      });
    }
  }

  return await db.friendship.create({
    data: {
      requesterId,
      receiverId: receiver.id,
      accepted: false,
    },
  });
}

export async function respondToFriendRequest(userId: string, requesterId: string, accept: boolean) {
  const friendship = await db.friendship.findUnique({
    where: {
      requesterId_receiverId: {
        requesterId,
        receiverId: userId,
      },
    },
  });

  if (!friendship) {
    throw new Error("Friend request not found.");
  }

  if (accept) {
    return await db.friendship.update({
      where: { id: friendship.id },
      data: { accepted: true },
    });
  } else {
    return await db.friendship.delete({
      where: { id: friendship.id },
    });
  }
}

export async function getFriendsList(userId: string) {
  const friendships = await db.friendship.findMany({
    where: {
      OR: [
        { requesterId: userId, accepted: true },
        { receiverId: userId, accepted: true },
      ],
    },
    include: {
      requester: {
        select: {
          id: true,
          email: true,
          fullName: true,
          username: true,
          avatarUrl: true,
          currentStreak: true,
          totalXp: true,
          stats: {
            select: {
              totalSolved: true,
              easySolved: true,
              mediumSolved: true,
              hardSolved: true,
            },
          },
          leetcodeProfile: {
            select: {
              username: true,
              contestRating: true,
              ranking: true,
              totalSolved: true,
              easySolved: true,
              mediumSolved: true,
              hardSolved: true,
            },
          },
        },
      },
      receiver: {
        select: {
          id: true,
          email: true,
          fullName: true,
          username: true,
          avatarUrl: true,
          currentStreak: true,
          totalXp: true,
          stats: {
            select: {
              totalSolved: true,
              easySolved: true,
              mediumSolved: true,
              hardSolved: true,
            },
          },
          leetcodeProfile: {
            select: {
              username: true,
              contestRating: true,
              ranking: true,
              totalSolved: true,
              easySolved: true,
              mediumSolved: true,
              hardSolved: true,
            },
          },
        },
      },
    },
  });

  return friendships.map((f) => {
    return f.requesterId === userId ? f.receiver : f.requester;
  });
}

export async function getPendingRequests(userId: string) {
  const pending = await db.friendship.findMany({
    where: {
      receiverId: userId,
      accepted: false,
    },
    include: {
      requester: {
        select: {
          id: true,
          email: true,
          fullName: true,
          avatarUrl: true,
        },
      },
    },
  });

  return pending.map((p) => p.requester);
}
