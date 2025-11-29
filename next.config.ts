import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable Strict Mode to prevent WebSocket connection issues in development
  // Strict Mode causes double-mounting which creates multiple WebSocket connections
  reactStrictMode: false,

  // Enable standalone output for Docker deployment
  output: 'standalone',

  // Disable Fast Refresh to prevent WebSocket disconnections during hot reload
  experimental: {
    webpackBuildWorker: false,
  },

  // Allow cross-origin requests from 127.0.0.1 in development
  // This fixes the warning about cross-origin requests when accessing via 127.0.0.1
  allowedDevOrigins: ['http://127.0.0.1:3000', 'http://localhost:3000', 'https://shipper-chat-three.vercel.app'],

  // Configure image domains for external images (Google profile pictures, etc.)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
    ],
  },
};

export default nextConfig;
