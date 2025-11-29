import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "@/lib/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: false, // We're using Google OAuth only
  },
  socialProviders: {
    google: {
      clientId: process.env.AUTH_GOOGLE_ID || "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET || "",
    },
  },
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXTAUTH_URL || "http://127.0.0.1:3000",
  basePath: "/api/auth",
  secret: process.env.BETTER_AUTH_SECRET || process.env.NEXTAUTH_SECRET || "",
  trustedOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://shipper-chat-three.vercel.app",
   " https://shipper-chat-v1.onrender.com" 
    
  ],
  advanced: {
    cookies: {
      state: {
        attributes: {
          sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
          secure: process.env.NODE_ENV === "production",
        },
      },
    },
    // Increase timeout for OAuth token exchange
    defaultCookieAttributes: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
    },
  },
});
