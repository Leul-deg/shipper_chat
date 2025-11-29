import { BaseRepository } from './base.repository';
import { Session, User } from '@prisma/client';

export class SessionRepository extends BaseRepository<Session> {
    async findByToken(token: string): Promise<(Session & { user: User }) | null> {
        const session = await this.prisma.session.findUnique({
            where: { token },
            include: {
                user: true,
            },
        });

        if (!session || new Date(session.expiresAt) < new Date()) {
            return null;
        }

        return session;
    }
}
