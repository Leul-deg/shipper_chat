import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined' 
    ? window.location.origin 
    : (process.env.NEXT_PUBLIC_BETTER_AUTH_URL || process.env.NEXT_PUBLIC_NEXTAUTH_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"),
  basePath: "/api/auth",
});

export const { useSession, signIn, signOut } = authClient;

