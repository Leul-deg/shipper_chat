import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import prisma from '@/lib/prisma'; // Adjust path to your prisma client

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Use the Prisma Adapter to link Auth.js to your database
  adapter: PrismaAdapter(prisma), 
  
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID || '',
      clientSecret: process.env.AUTH_GOOGLE_SECRET || '',
    }),
  ],

  // 🌟 BONUS POINT: JWT Configuration via Callbacks
  // This allows you to inject custom data (like your Prisma User ID) into the session
  callbacks: {
    async session({ session, user }) {
      // In the session callback, add the DB user ID to the session object
      // This ID is available because we use the Prisma Adapter
      if (session.user) {
        session.user.id = user.id; // Inject your User.id from the DB
      }
      return session;
    },
  },
  
  // Choose how you want to save the user session
  session: {
    strategy: 'database', // Recommended for persistence and security with an adapter
    // For the bonus point: change to 'jwt' to use token-based sessions 
    // strategy: 'jwt',
  }
});

// Export handlers for Next.js API Routes
export const GET = handlers.GET;
export const POST = handlers.POST;