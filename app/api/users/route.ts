import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getSession();

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all users except the current user
    const users = await prisma.user.findMany({
      where: {
        NOT: {
          id: session.user.id,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        picture: true,
        isOnline: true,
        lastSeen: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Format users with picture/image compatibility
    const formattedUsers = users.map((user) => ({
      id: user.id,
      name: user.name || user.email?.split('@')[0] || 'User',
      email: user.email,
      picture: user.picture || user.image || null,
      isOnline: user.isOnline,
      lastSeen: user.lastSeen?.toISOString() || null,
    }));

    return NextResponse.json({ users: formattedUsers });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

