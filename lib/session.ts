import { cookies } from "next/headers";
import { auth } from "./auth";
import { User, Session } from "@prisma/client";

// Helper function to get session in server components and API routes
export async function getSession() {
    try {
        const cookieStore = await cookies();
        const response = await auth.api.getSession({
            headers: {
                cookie: cookieStore.toString(),
            },
        });

        if (!response) {
            return null;
        }

        const { user, session } = response as unknown as { user: User; session: Session };

        if (user) {
            return {
                user,
                session,
            };
        }
        return null;
    } catch (error) {
        console.error('Error getting session:', error);
        return null;
    }
}
