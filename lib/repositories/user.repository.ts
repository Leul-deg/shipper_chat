import { BaseRepository } from './base.repository';
import { User } from '@prisma/client';

export class UserRepository extends BaseRepository<User> {
    async findById(id: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { id },
        });
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { email },
        });
    }

    async updateOnlineStatus(userId: string, isOnline: boolean): Promise<User> {
        return this.prisma.user.update({
            where: { id: userId },
            data: {
                isOnline,
                lastSeen: isOnline ? undefined : new Date(),
            },
        });
    }
}
