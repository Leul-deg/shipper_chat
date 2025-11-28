import { BaseRepository } from './base.repository';
import { ChatSession, ChatMessage, SessionParticipant, User } from '@prisma/client';

export class ChatRepository extends BaseRepository<ChatSession> {
    async createSession(participantIds: string[], isGroup: boolean = false): Promise<ChatSession> {
        return this.prisma.chatSession.create({
            data: {
                isGroup,
                participants: {
                    create: participantIds.map(userId => ({ userId })),
                },
            },
            include: {
                participants: true,
            },
        });
    }

    async findSessionById(sessionId: string): Promise<(ChatSession & { participants: (SessionParticipant & { user: User })[] }) | null> {
        return this.prisma.chatSession.findUnique({
            where: { id: sessionId },
            include: {
                participants: {
                    include: {
                        user: true,
                    },
                },
            },
        });
    }

    async createMessage(sessionId: string, senderId: string, content: string): Promise<ChatMessage> {
        return this.prisma.chatMessage.create({
            data: {
                sessionId,
                senderId,
                content,
            },
        });
    }

    async getMessages(sessionId: string, limit: number = 50): Promise<ChatMessage[]> {
        return this.prisma.chatMessage.findMany({
            where: { sessionId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }

    async markMessagesAsRead(sessionId: string, userId: string): Promise<void> {
        // Mark all messages in the session as read where the sender is NOT the current user
        await this.prisma.chatMessage.updateMany({
            where: {
                sessionId,
                senderId: { not: userId },
                isRead: false,
            },
            data: {
                isRead: true,
            },
        });
    }
}
