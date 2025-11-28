import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import prisma from '@/lib/prisma';

// GET: Get session details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await getSession();

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await params;

    // Get session with participants
    const chatSession = await prisma.chatSession.findUnique({
      where: { id: sessionId },
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

    if (!chatSession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Check if user is a participant
    const isParticipant = chatSession.participants.some(
      (p) => p.userId === session.user.id
    );

    if (!isParticipant) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get the other participant
    const otherParticipant = chatSession.participants.find(
      (p) => p.userId !== session.user.id
    )?.user;

    return NextResponse.json({
      session: {
        id: chatSession.id,
        isGroup: chatSession.isGroup,
        createdAt: chatSession.createdAt.toISOString(),
        updatedAt: chatSession.updatedAt.toISOString(),
        otherParticipant: otherParticipant
          ? {
            id: otherParticipant.id,
            name: otherParticipant.name || otherParticipant.email?.split('@')[0] || 'User',
            email: otherParticipant.email,
            picture: otherParticipant.picture || otherParticipant.image || null,
            isOnline: otherParticipant.isOnline,
          }
          : null,
        participants: chatSession.participants.map((p) => ({
          userId: p.userId,
          user: {
            id: p.user.id,
            name: p.user.name || p.user.email?.split('@')[0] || 'User',
            email: p.user.email,
            picture: p.user.picture || p.user.image || null,
            isOnline: p.user.isOnline,
          },
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a session (optional)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await getSession();

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await params;

    // Check if user is a participant
    const chatSession = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        participants: true,
      },
    });

    if (!chatSession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    const isParticipant = chatSession.participants.some(
      (p) => p.userId === session.user.id
    );

    if (!isParticipant) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Delete session (cascade will delete messages and participants)
    await prisma.chatSession.delete({
      where: { id: sessionId },
    });

    return NextResponse.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    );
  }
}

