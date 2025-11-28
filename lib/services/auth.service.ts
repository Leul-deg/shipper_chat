import { SessionRepository } from '../repositories/session.repository';
import { UserRepository } from '../repositories/user.repository';
import { User } from '@prisma/client';
import { auth } from '@/lib/auth';

export class AuthService {
    private sessionRepo: SessionRepository;
    private userRepo: UserRepository;

    constructor() {
        this.sessionRepo = new SessionRepository();
        this.userRepo = new UserRepository();
    }

    async validateSession(token: string): Promise<User | null> {
        // Deprecated: Use validateSessionFromHeaders instead
        const session = await this.sessionRepo.findByToken(token);
        if (!session) return null;
        return session.user;
    }

    async validateSessionFromHeaders(reqHeaders: any): Promise<User | null> {
        try {
            const session = await auth.api.getSession({
                headers: reqHeaders
            });
            return session?.user ? (session.user as unknown as User) : null;
        } catch (error) {
            console.error('Error validating session with Better Auth:', error);
            return null;
        }
    }

    async extractSessionToken(cookies: string): Promise<string | null> {
        // Try Better Auth cookie name first
        let match = cookies.match(/better-auth\.session_token=([^;]+)/);
        if (match) return match[1];

        // Fallback to legacy NextAuth cookie name for migration
        match = cookies.match(/next-auth\.session-token=([^;]+)/);
        return match ? match[1] : null;
    }
}
