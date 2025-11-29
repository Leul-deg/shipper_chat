import { ChatRepository } from '../repositories/chat.repository';
import { ChatMessage, ChatSession } from '@prisma/client';

export class ChatService {
    private chatRepo: ChatRepository;

    constructor() {
        this.chatRepo = new ChatRepository();
    }

    async saveMessage(sessionId: string, senderId: string, content: string): Promise<ChatMessage> {
        return this.chatRepo.createMessage(sessionId, senderId, content);
    }

    async getSession(sessionId: string): Promise<ChatSession | null> {
        return this.chatRepo.findSessionById(sessionId);
    }

    async getSessionParticipants(sessionId: string): Promise<string[]> {
        const session = await this.chatRepo.findSessionById(sessionId);
        if (!session) return [];
        return session.participants.map(p => p.userId);
    }

    async markAsRead(sessionId: string, userId: string): Promise<void> {
        return this.chatRepo.markMessagesAsRead(sessionId, userId);
    }
}
