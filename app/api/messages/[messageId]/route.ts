import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import prisma from '@/lib/prisma';

// PATCH: Mark message as read
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const session = await getSession();

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId } = await params;

    // Get message to verify access
    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      include: {
        session: {
          include: {
            participants: true,
          },
        },
      },
    });

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // Verify user is a participant (but not the sender)
    const isParticipant = message.session.participants.some(
      (p) => p.userId === session.user.id
    );

    if (!isParticipant) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Only mark as read if user is not the sender
    if (message.senderId === session.user.id) {
      return NextResponse.json({
        message: {
          ...message,
          isRead: message.isRead,
        },
      });
    }

    // Update message as read
    const updatedMessage = await prisma.chatMessage.update({
      where: { id: messageId },
      data: { isRead: true },
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
    });

    return NextResponse.json({
      message: {
        id: updatedMessage.id,
        content: updatedMessage.content,
        senderId: updatedMessage.senderId,
        sender: {
          id: updatedMessage.sender.id,
          name: updatedMessage.sender.name || updatedMessage.sender.email?.split('@')[0] || 'User',
          email: updatedMessage.sender.email,
          picture: updatedMessage.sender.picture || updatedMessage.sender.image || null,
        },
        sessionId: updatedMessage.sessionId,
        createdAt: updatedMessage.createdAt.toISOString(),
        isRead: updatedMessage.isRead,
      },
    });
  } catch (error) {
    console.error('Error updating message:', error);
    return NextResponse.json(
      { error: 'Failed to update message' },
      { status: 500 }
    );
  }
}

