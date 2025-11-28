'use client';

import { useWebSocketContext } from '@/components/providers/WebSocketProvider';
import { useEffect } from 'react';
import type { WebSocketMessage } from '@/types/websocket';

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { isConnected, sendMessage, subscribe } = useWebSocketContext();
  const { onMessage } = options;

  useEffect(() => {
    if (onMessage) {
      const unsubscribe = subscribe(onMessage);
      return unsubscribe;
    }
  }, [onMessage, subscribe]);

  return {
    isConnected,
    sendMessage,
    subscribe,
  };
}

