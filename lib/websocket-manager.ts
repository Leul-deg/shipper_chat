import { WebSocketService } from '@/lib/services/websocket.service';

let manager: WebSocketService | null = null;

export function setWebSocketManager(service: WebSocketService) {
  manager = service;
}

export function getWebSocketManager() {
  return manager;
}

/**
 * Broadcast a message to specific users via the WebSocket server.
 * This works across process boundaries by calling an internal HTTP endpoint
 * when the in-process manager is not available.
 */
export async function broadcastToUsersAcrossProcesses(
  userIds: string[],
  message: { type: string; payload: Record<string, unknown>; timestamp: number }
): Promise<boolean> {
  // Try in-process first (fastest)
  if (manager) {
    manager.broadcastToUsers(userIds, message as any);
    return true;
  }

  // Fall back to internal HTTP endpoint on the WebSocket server
  try {
    const response = await fetch('http://localhost:3001/internal/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIds, message }),
    });
    return response.ok;
  } catch (error) {
    console.error('[WebSocket Manager] Failed to broadcast via HTTP:', error);
    return false;
  }
}

