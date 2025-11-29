import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const session = await getSession();

        if (!session || !session.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get('q');

        if (!query || query.trim().length === 0) {
            return NextResponse.json({ users: [] });
        }

        // Search users by name or email
        const users = await prisma.user.findMany({
            where: {
                AND: [
                    {
                        id: {
                            not: session.user.id, // Exclude current user
                        },
                    },
                    {
                        OR: [
                            {
                                name: {
                                    contains: query,
                                    mode: 'insensitive',
                                },
                            },
                            {
                                email: {
                                    contains: query,
                                    mode: 'insensitive',
                                },
                            },
                        ],
                    },
                ],
            },
            select: {
                id: true,
                name: true,
                email: true,
                picture: true,
                image: true,
                isOnline: true,
            },
            take: 20, // Limit results
        });

        // Format response
        const formattedUsers = users.map((user) => ({
            id: user.id,
            name: user.name || user.email?.split('@')[0] || 'User',
            email: user.email,
            picture: user.picture || user.image || null,
            isOnline: user.isOnline,
        }));

        return NextResponse.json({ users: formattedUsers });
    } catch (error) {
        console.error('Error searching users:', error);
        return NextResponse.json(
            { error: 'Failed to search users' },
            { status: 500 }
        );
    }
}
