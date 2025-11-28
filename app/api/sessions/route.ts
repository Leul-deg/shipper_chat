import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import prisma from '@/lib/prisma';

// GET: Get all sessions for the current user
export async function GET() {
  try {
    const session = await getSession();

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all sessions where the user is a participant
    const sessions = await prisma.chatSession.findMany({
      where: {
        participants: {
          some: {
            userId: session.user.id,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                picture: true,
                isOnline: true,
              },
            },
          },
        },
        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1, // Get only the last message for preview
          include: {
            sender: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Format sessions with last message and other participant info
    const formattedSessions = [];
    for (const chatSession of sessions) {
      const otherParticipant = chatSession.participants.find(
        (p) => p.userId !== session.user.id
      )?.user;

      if (!otherParticipant || otherParticipant.email === 'ai@shipper-chat.local') {
        continue;
      }

      const lastMessage = chatSession.messages[0];

      formattedSessions.push({
        id: chatSession.id,
        isGroup: chatSession.isGroup,
        createdAt: chatSession.createdAt.toISOString(),
        updatedAt: chatSession.updatedAt.toISOString(),
        otherParticipant: {
          id: otherParticipant.id,
          name: otherParticipant.name || otherParticipant.email?.split('@')[0] || 'User',
          email: otherParticipant.email,
          picture: otherParticipant.picture || otherParticipant.image || null,
          isOnline: otherParticipant.isOnline,
        },
        lastMessage: lastMessage
          ? {
            id: lastMessage.id,
            content: lastMessage.content,
            senderId: lastMessage.senderId,
            senderName: lastMessage.sender.name || 'User',
            createdAt: lastMessage.createdAt.toISOString(),
            isRead: lastMessage.isRead,
          }
          : null,
        unreadCount: chatSession.messages.filter((m) => !m.isRead && m.senderId !== session.user.id).length,
      });
    }

    // Deduplicate sessions by otherParticipant.id
    // If multiple sessions exist with the same user, keep the one with the most recent activity
    const uniqueSessionsMap = new Map();

    formattedSessions.forEach(session => {
      if (!session.otherParticipant) return;

      if (session.otherParticipant.email === 'ai@shipper-chat.local') {
        return;
      }

      const existing = uniqueSessionsMap.get(session.otherParticipant.id);
      if (!existing) {
        uniqueSessionsMap.set(session.otherParticipant.id, session);
      } else {
        // If this session is newer, replace the existing one
        if (new Date(session.updatedAt) > new Date(existing.updatedAt)) {
          uniqueSessionsMap.set(session.otherParticipant.id, session);
        }
      }
    });

    const uniqueSessions = Array.from(uniqueSessionsMap.values())
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return NextResponse.json({ sessions: uniqueSessions });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}

// POST: Create a new chat session between two users
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    let { userId: fallbackUserId, otherUserId } = body;
    const otherUserIdToUse = otherUserId || fallbackUserId;

    if (!otherUserIdToUse) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (otherUserIdToUse === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot create session with yourself' },
        { status: 400 }
      );
    }

    let targetUserId = otherUserIdToUse;

    // Check if a session already exists between these two users
    const existingSession = await prisma.chatSession.findFirst({
      where: {
        isGroup: false,
        participants: {
      every: {
        userId: {
          in: [session.user.id, targetUserId],
        },
      },
        },
      },
      include: {
        participants: true,
      },
    });

    // Verify that the existing session has exactly these two users
    if (existingSession) {
      const participantIds = existingSession.participants.map((p) => p.userId);
      if (
        participantIds.includes(session.user.id) &&
        participantIds.includes(targetUserId) &&
        participantIds.length === 2
      ) {
        // Return existing session
        return NextResponse.json({
          session: {
            id: existingSession.id,
            message: 'Session already exists',
          },
        });
      }
    }

    // Check if this is an AI chat request (special handling)
    if (targetUserId === 'ai-user-placeholder' || targetUserId.startsWith('ai-')) {
      // Find or create AI user
      let aiUser = await prisma.user.findFirst({
        where: { email: 'ai@shipper-chat.local' },
      });

      if (!aiUser) {
        aiUser = await prisma.user.create({
          data: {
            email: 'ai@shipper-chat.local',
            name: 'AI Assistant',
            picture: null,
            isOnline: true,
          },
        });
      }

      targetUserId = aiUser.id;
    }

    // Verify the other user exists
    const otherUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!otherUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Create new session
    const newSession = await prisma.chatSession.create({
      data: {
        isGroup: false,
        participants: {
          create: [
            { userId: session.user.id },
            { userId: targetUserId },
          ],
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                picture: true,
                isOnline: true,
              },
            },
          },
        },
      },
    });

    // Format response
    const otherParticipant = newSession.participants.find(
      (p) => p.userId !== session.user.id
    )?.user;

    return NextResponse.json({
      session: {
        id: newSession.id,
        isGroup: newSession.isGroup,
        createdAt: newSession.createdAt.toISOString(),
        updatedAt: newSession.updatedAt.toISOString(),
        otherParticipant: otherParticipant
          ? {
            id: otherParticipant.id,
            name: otherParticipant.name || otherParticipant.email?.split('@')[0] || 'User',
            email: otherParticipant.email,
            picture: otherParticipant.picture || otherParticipant.image || null,
            isOnline: otherParticipant.isOnline,
          }
          : null,
      },
    });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

