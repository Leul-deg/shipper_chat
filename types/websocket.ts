// WebSocket Message Types
export type WebSocketMessageType =
  | 'USER_ONLINE'
  | 'USER_OFFLINE'
  | 'MESSAGE_SENT'
  | 'MESSAGE_RECEIVED'
  | 'TYPING_START'
  | 'TYPING_STOP'
  | 'READ_RECEIPT'
  | 'PING'
  | 'PONG'
  | 'ERROR';

export interface WebSocketMessage {
  type: WebSocketMessageType;
  payload: any;
  timestamp?: number;
  userId?: string;
  sessionId?: string;
}

export interface UserOnlinePayload {
  userId: string;
  isOnline: boolean;
  lastSeen?: string;
}

export interface MessagePayload {
  messageId: string;
  sessionId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

export interface TypingPayload {
  userId: string;
  sessionId: string;
  isTyping: boolean;
}

export interface ErrorPayload {
  code: string;
  message: string;
}

// Connection metadata
export interface ConnectionMetadata {
  userId: string;
  connectedAt: number;
  lastPing?: number;
}

