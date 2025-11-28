import prisma from './prisma';

/**
 * Get or create a chat session between two users
 */
export async function getOrCreateSession(userId1: string, userId2: string) {
  // Check if session exists
  const existingSession = await prisma.chatSession.findFirst({
    where: {
      isGroup: false,
      participants: {
        every: {
          userId: {
            in: [userId1, userId2],
          },
        },
      },
    },
    include: {
      participants: true,
    },
  });

  // Verify it's exactly these two users
  if (existingSession) {
    const participantIds = existingSession.participants.map((p) => p.userId);
    if (
      participantIds.includes(userId1) &&
      participantIds.includes(userId2) &&
      participantIds.length === 2
    ) {
      return existingSession;
    }
  }

  // Create new session
  return await prisma.chatSession.create({
    data: {
      isGroup: false,
      participants: {
        create: [{ userId: userId1 }, { userId: userId2 }],
      },
    },
  });
}

/**
 * Check if user is participant in session
 */
export async function isSessionParticipant(
  sessionId: string,
  userId: string
): Promise<boolean> {
  const participant = await prisma.sessionParticipant.findUnique({
    where: {
      userId_sessionId: {
        userId,
        sessionId,
      },
    },
  });

  return !!participant;
}

