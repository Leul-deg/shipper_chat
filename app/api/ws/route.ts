import { NextRequest } from 'next/server';

// Note: Next.js API routes don't support WebSocket upgrades directly
// This is a placeholder that explains the WebSocket setup
// WebSocket connections are handled by the custom server (server.ts)

export async function GET(request: NextRequest) {
  // This route cannot handle WebSocket upgrades
  // WebSocket connections are handled by the WebSocketService in server.ts

  return new Response(
    JSON.stringify({
      message: 'WebSocket endpoint. Use ws://localhost:3000/api/ws to connect.',
      note: 'WebSocket connections are handled by the custom server',
      status: 'ready',
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
