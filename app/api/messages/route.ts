import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import prisma from '@/lib/prisma';

// GET: Get messages for a session
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const cursor = searchParams.get('cursor');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Verify user is a participant
    const isParticipant = await prisma.sessionParticipant.findUnique({
      where: {
        userId_sessionId: {
          userId: session.user.id,
          sessionId,
        },
      },
    });

    if (!isParticipant) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get messages
    const where = cursor
      ? {
        sessionId,
        createdAt: {
          lt: new Date(cursor),
        },
      }
      : { sessionId };

    const messages = await prisma.chatMessage.findMany({
      where,
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            picture: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit + 1, // Take one extra to check if there are more
    });

    const hasMore = messages.length > limit;
    const messagesToReturn = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore && messagesToReturn.length > 0
      ? messagesToReturn[messagesToReturn.length - 1].createdAt.toISOString()
      : null;

    // Reverse to show oldest first
    const reversedMessages = messagesToReturn.reverse();

    return NextResponse.json({
      messages: reversedMessages.map((msg) => ({
        id: msg.id,
        content: msg.content,
        senderId: msg.senderId,
        sender: {
          id: msg.sender.id,
          name: msg.sender.name || msg.sender.email?.split('@')[0] || 'User',
          email: msg.sender.email,
          picture: msg.sender.picture || msg.sender.image || null,
        },
        sessionId: msg.sessionId,
        createdAt: msg.createdAt.toISOString(),
        isRead: msg.isRead,
      })),
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// POST: Create a new message
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, content } = body;

    if (!sessionId || !content) {
      return NextResponse.json(
        { error: 'Session ID and content are required' },
        { status: 400 }
      );
    }

    // Verify user is a participant
    const isParticipant = await prisma.sessionParticipant.findUnique({
      where: {
        userId_sessionId: {
          userId: session.user.id,
          sessionId,
        },
      },
    });

    if (!isParticipant) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Create message
    const message = await prisma.chatMessage.create({
      data: {
        content: content.trim(),
        senderId: session.user.id,
        sessionId,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            picture: true,
          },
        },
        session: {
          include: {
            participants: true,
          },
        },
      },
    });

    // Update session updatedAt
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    // Note: WebSocket broadcasting is now handled server-side via the WebSocket service
    // Messages will be broadcast when received through the WebSocket connection

    return NextResponse.json({
      message: {
        id: message.id,
        content: message.content,
        senderId: message.senderId,
        sender: {
          id: message.sender.id,
          name: message.sender.name || message.sender.email?.split('@')[0] || 'User',
          email: message.sender.email,
          picture: message.sender.picture || message.sender.image || null,
        },
        sessionId: message.sessionId,
        createdAt: message.createdAt.toISOString(),
        isRead: message.isRead,
      },
    });
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json(
      { error: 'Failed to create message' },
      { status: 500 }
    );
  }
}

