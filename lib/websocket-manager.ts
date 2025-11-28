import { WebSocketService } from '@/lib/services/websocket.service';

let manager: WebSocketService | null = null;

export function setWebSocketManager(service: WebSocketService) {
  manager = service;
}

export function getWebSocketManager() {
  return manager;
}

