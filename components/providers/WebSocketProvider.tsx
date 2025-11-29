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
    const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const messageHandlersRef = useRef<Set<(message: WebSocketMessage) => void>>(new Set());
    const reconnectAttemptsRef = useRef(0);
    const isConnectingRef = useRef(false);
    const maxReconnectAttempts = 10; // Increased for better resilience
    const heartbeatInterval = 25000; // Send heartbeat every 25 seconds (under Render's 60s timeout)

    const connect = useCallback(() => {
        if (typeof window === 'undefined') return;

        // Prevent multiple simultaneous connection attempts
        if (isConnectingRef.current) {
            console.log('[WebSocket] Connection attempt already in progress, skipping');
            return;
        }

        // WebSocket connects to the same host/port as the main app
        // In production (Render), this uses the same domain
        // NEXT_PUBLIC_WS_URL can override if needed (e.g., for separate WS server)
        const wsUrlOverride = process.env.NEXT_PUBLIC_WS_URL;
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const url = wsUrlOverride 
            ? `${wsUrlOverride}/api/ws`
            : `${protocol}//${window.location.host}/api/ws`;

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
                isConnectingRef.current = false;
                
                // Start heartbeat to keep connection alive through Render's proxy
                if (heartbeatIntervalRef.current) {
                    clearInterval(heartbeatIntervalRef.current);
                }
                heartbeatIntervalRef.current = setInterval(() => {
                    if (wsRef.current?.readyState === WebSocket.OPEN) {
                        wsRef.current.send(JSON.stringify({ 
                            type: 'PING', 
                            payload: {}, 
                            timestamp: Date.now() 
                        }));
                    }
                }, heartbeatInterval);
            };

            ws.onmessage = (event) => {
                try {
                    const message: WebSocketMessage = JSON.parse(event.data);
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
                isConnectingRef.current = false;
                
                // Clear heartbeat
                if (heartbeatIntervalRef.current) {
                    clearInterval(heartbeatIntervalRef.current);
                    heartbeatIntervalRef.current = null;
                }

                // Reconnect on abnormal closure (1006) or other non-normal closures
                // 1000 = normal close, 1001 = going away (page navigation)
                const shouldReconnect = event.code !== 1000 && event.code !== 1001;
                
                if (shouldReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
                    // Faster reconnect for code 1006 (abnormal closure from proxy)
                    const baseTimeout = event.code === 1006 ? 500 : 1000;
                    const timeout = Math.min(baseTimeout * Math.pow(1.5, reconnectAttemptsRef.current), 10000);
                    console.log(`[WebSocket] 🔄 Reconnecting in ${timeout}ms... (Attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);

                    reconnectTimeoutRef.current = setTimeout(() => {
                        reconnectAttemptsRef.current += 1;
                        connect();
                    }, timeout);
                } else if (event.code === 1000 || event.code === 1001) {
                    console.log('[WebSocket] Normal closure, not reconnecting');
                } else {
                    console.error('[WebSocket] Max reconnection attempts reached, will retry on user action');
                    // Reset attempts so next user action can trigger reconnect
                    setTimeout(() => { reconnectAttemptsRef.current = 0; }, 30000);
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
        if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
        }
        if (wsRef.current) {
            wsRef.current.close(1000, 'Client disconnecting'); // Normal closure
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
