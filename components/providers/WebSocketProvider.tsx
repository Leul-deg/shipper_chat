'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import type { WebSocketMessage } from '@/types/websocket';

interface WebSocketContextType {
    isConnected: boolean;
    sendMessage: (message: WebSocketMessage) => boolean;
    subscribe: (handler: (message: WebSocketMessage) => void) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
    const [isConnected, setIsConnected] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const messageHandlersRef = useRef<Set<(message: WebSocketMessage) => void>>(new Set());
    const reconnectAttemptsRef = useRef(0);
    const isConnectingRef = useRef(false); // Prevent multiple simultaneous connection attempts
    const maxReconnectAttempts = 5;
    const reconnectInterval = 3000;

    const connect = useCallback(() => {
        if (typeof window === 'undefined') return;

        // Prevent multiple simultaneous connection attempts
        if (isConnectingRef.current) {
            console.log('[WebSocket] Connection attempt already in progress, skipping');
            return;
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const hostname = window.location.hostname;
        const url = `${protocol}//${hostname}:3001/api/ws`;

        if (wsRef.current?.readyState === WebSocket.OPEN) {
            console.log('[WebSocket] Already connected, skipping');
            return;
        }

        if (wsRef.current?.readyState === WebSocket.CONNECTING) {
            console.log('[WebSocket] Connection in progress, skipping');
            return;
        }

        try {
            console.log('[WebSocket] Creating new connection to:', url);
            isConnectingRef.current = true; // Set flag
            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('[WebSocket] ✅ Connection established successfully');
                setIsConnected(true);
                reconnectAttemptsRef.current = 0;
                isConnectingRef.current = false; // Clear flag on success
            };

            ws.onmessage = (event) => {
                try {
                    const message: WebSocketMessage = JSON.parse(event.data);
                    // Call all registered message handlers
                    messageHandlersRef.current.forEach((handler) => {
                        handler(message);
                    });
                } catch (error) {
                    console.error('[WebSocket] Error parsing message:', error);
                }
            };

            ws.onclose = (event) => {
                console.log('[WebSocket] ❌ Connection closed. Code:', event.code, 'Reason:', event.reason, 'Clean:', event.wasClean);
                setIsConnected(false);
                wsRef.current = null;
                isConnectingRef.current = false; // Clear flag on close

                // Attempt to reconnect only if not a normal closure
                if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
                    const timeout = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
                    console.log(`[WebSocket] 🔄 Reconnecting in ${timeout}ms... (Attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);

                    reconnectTimeoutRef.current = setTimeout(() => {
                        reconnectAttemptsRef.current += 1;
                        connect();
                    }, timeout);
                } else if (event.code === 1000) {
                    console.log('[WebSocket] Normal closure, not reconnecting');
                } else {
                    console.error('[WebSocket] Max reconnection attempts reached');
                }
            };

            ws.onerror = (error) => {
                console.error('[WebSocket] ⚠️ Error occurred:', error);
                isConnectingRef.current = false; // Clear flag on error
            };
        } catch (error) {
            console.error('[WebSocket] Error creating connection:', error);
            isConnectingRef.current = false; // Clear flag on exception
        }
    }, []);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setIsConnected(false);
    }, []);

    const sendMessage = useCallback((message: WebSocketMessage) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message));
            return true;
        }
        console.warn('WebSocket is not connected');
        return false;
    }, []);

    const subscribe = useCallback((handler: (message: WebSocketMessage) => void) => {
        messageHandlersRef.current.add(handler);
        return () => {
            messageHandlersRef.current.delete(handler);
        };
    }, []);

    useEffect(() => {
        console.log('[WebSocketProvider] 🚀 Provider mounted, initializing connection');
        connect();
        return () => {
            console.log('[WebSocketProvider] 💀 Provider unmounting, closing connection');
            disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run once on mount

    return (
        <WebSocketContext.Provider value={{ isConnected, sendMessage, subscribe }}>
            {children}
        </WebSocketContext.Provider>
    );
}

export function useWebSocketContext() {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useWebSocketContext must be used within a WebSocketProvider');
    }
    return context;
}
