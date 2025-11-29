import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { AuthService } from './auth.service';
import { ChatService } from './chat.service';
import { UserRepository } from '../repositories/user.repository';
import { WebSocketMessage, UserOnlinePayload, MessagePayload, TypingPayload, ConnectionMetadata } from '@/types/websocket';

export class WebSocketService {
    private wss: WebSocketServer;
    private authService: AuthService;
    private chatService: ChatService;
    private userRepo: UserRepository;

    private connections: Map<string, WebSocket> = new Map(); // connectionId -> WebSocket
    private userConnections: Map<string, Set<string>> = new Map(); // userId -> Set of connectionIds
    private connectionMetadata: Map<string, ConnectionMetadata> = new Map(); // connectionId -> metadata

    constructor() {
        this.wss = new WebSocketServer({
            noServer: true,
            path: '/api/ws',
            clientTracking: true,
            perMessageDeflate: false,
        });
        this.authService = new AuthService();
        this.chatService = new ChatService();
        this.userRepo = new UserRepository();

        this.init();
    }

    public handleUpgrade(request: any, socket: any, head: any) {
        this.wss.handleUpgrade(request, socket, head, (ws) => {
            this.wss.emit('connection', ws, request);
        });
    }

    private init() {
        console.log('WebSocket server initialized on path: /api/ws');

        this.wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
            console.log('New WebSocket connection attempt from:', req.socket.remoteAddress);

            try {
                // Authenticate using Better Auth via headers
                const headers = new Headers();
                Object.entries(req.headers).forEach(([key, value]) => {
                    if (Array.isArray(value)) {
                        value.forEach(v => headers.append(key, v));
                    } else if (value) {
                        headers.set(key, value);
                    }
                });

                console.log('Validating session with Better Auth...');
                const user = await this.authService.validateSessionFromHeaders(headers);
                console.log('Session validated for user:', user ? user.id : 'null');

                if (!user) {
                    console.warn('WebSocket connection rejected: Invalid session');
                    ws.close(1008, 'Unauthorized: Invalid session');
                    return;
                }

                console.log('WebSocket connection established for user:', user.id);
                await this.addConnection(ws, user.id);
            } catch (error) {
                console.error('WebSocket connection error:', error);
                ws.close(1011, 'Internal server error');
            }
        });

        // Aggressive heartbeat for Render/cloud proxies (every 25 seconds)
        setInterval(() => this.pingAllConnections(), 25000);
    }

    private async addConnection(ws: WebSocket, userId: string) {
        const connectionId = `${userId}-${Date.now()}-${Math.random()}`;

        this.connections.set(connectionId, ws);

        if (!this.userConnections.has(userId)) {
            this.userConnections.set(userId, new Set());
        }
        this.userConnections.get(userId)!.add(connectionId);

        this.connectionMetadata.set(connectionId, {
            userId,
            connectedAt: Date.now(),
            lastPing: Date.now(),
        });

        // Update status
        await this.userRepo.updateOnlineStatus(userId, true);
        await this.broadcastUserStatus(userId, true);

        // Handlers
        ws.on('message', async (data: Buffer) => {
            try {
                const message: WebSocketMessage = JSON.parse(data.toString());
                await this.handleMessage(connectionId, message);
            } catch (error) {
                console.error('Error handling message:', error);
            }
        });

        ws.on('close', (code, reason) => {
            console.log(`[WebSocket] Client disconnected. ConnectionId: ${connectionId}, Code: ${code}, Reason: ${reason.toString()}`);
            this.removeConnection(connectionId);
        });
        ws.on('pong', () => {
            const meta = this.connectionMetadata.get(connectionId);
            if (meta) meta.lastPing = Date.now();
        });

        // Welcome
        this.send(ws, { type: 'PONG', payload: { message: 'Connected' }, timestamp: Date.now() });
    }

    private async removeConnection(connectionId: string) {
        const meta = this.connectionMetadata.get(connectionId);
        if (!meta) return;

        this.connections.delete(connectionId);
        this.connectionMetadata.delete(connectionId);

        const userConns = this.userConnections.get(meta.userId);
        if (userConns) {
            userConns.delete(connectionId);
            if (userConns.size === 0) {
                this.userConnections.delete(meta.userId);
                await this.userRepo.updateOnlineStatus(meta.userId, false);
                await this.broadcastUserStatus(meta.userId, false);
            }
        }
    }

    private async handleMessage(connectionId: string, message: WebSocketMessage) {
        const meta = this.connectionMetadata.get(connectionId);
        if (!meta) return;

        switch (message.type) {
            case 'PING':
                const ws = this.connections.get(connectionId);
                if (ws) this.send(ws, { type: 'PONG', payload: { timestamp: Date.now() }, timestamp: Date.now() });
                break;

            case 'MESSAGE_SENT':
                // Save to DB via ChatService
                const savedMsg = await this.chatService.saveMessage(
                    message.payload.sessionId,
                    meta.userId,
                    message.payload.content
                );

                // Broadcast to ALL participants including sender
                // Sender needs this to replace their optimistic message with the real one
                await this.broadcastToSession(message.payload.sessionId, {
                    type: 'MESSAGE_RECEIVED',
                    payload: {
                        ...message.payload,
                        id: savedMsg.id,
                        messageId: savedMsg.id, // Include both for compatibility
                        senderId: meta.userId,
                        createdAt: savedMsg.createdAt.toISOString(),
                    },
                    timestamp: Date.now()
                }); // No excludeUserId - sender needs the confirmed message too
                break;

            case 'TYPING_START':
            case 'TYPING_STOP':
                await this.broadcastToSession(message.payload.sessionId, {
                    type: message.type,
                    payload: { userId: meta.userId, sessionId: message.payload.sessionId, isTyping: message.payload.isTyping },
                    timestamp: Date.now()
                }, meta.userId);
                break;

            case 'READ_RECEIPT':
                // Update DB
                await this.chatService.markAsRead(message.payload.sessionId, meta.userId);

                // Broadcast to other participants so they see "Seen"
                await this.broadcastToSession(message.payload.sessionId, {
                    type: 'READ_RECEIPT',
                    payload: {
                        sessionId: message.payload.sessionId,
                        userId: meta.userId, // Who read the messages
                    },
                    timestamp: Date.now()
                }, meta.userId);
                break;
        }
    }

    private async broadcastToSession(sessionId: string, message: WebSocketMessage, excludeUserId?: string) {
        const participants = await this.chatService.getSessionParticipants(sessionId);
        const messageStr = JSON.stringify(message);

        for (const userId of participants) {
            if (userId === excludeUserId) continue;

            const conns = this.userConnections.get(userId);
            if (conns) {
                conns.forEach(connId => {
                    const ws = this.connections.get(connId);
                    if (ws?.readyState === WebSocket.OPEN) {
                        ws.send(messageStr);
                    }
                });
            }
        }
    }

    public async broadcastMessageToSession(sessionId: string, message: WebSocketMessage, excludeUserId?: string) {
        await this.broadcastToSession(sessionId, message, excludeUserId);
    }

    /**
     * Broadcast a message directly to specific users by their IDs.
     * Use this when you can't rely on session participants (e.g., after session deletion).
     */
    public broadcastToUsers(userIds: string[], message: WebSocketMessage, excludeUserId?: string) {
        const messageStr = JSON.stringify(message);
        for (const userId of userIds) {
            if (userId === excludeUserId) continue;
            const conns = this.userConnections.get(userId);
            if (conns) {
                conns.forEach(connId => {
                    const ws = this.connections.get(connId);
                    if (ws?.readyState === WebSocket.OPEN) ws.send(messageStr);
                });
            }
        }
    }

    private async broadcastUserStatus(userId: string, isOnline: boolean) {
        const message: WebSocketMessage = {
            type: isOnline ? 'USER_ONLINE' : 'USER_OFFLINE',
            payload: { userId, isOnline, lastSeen: isOnline ? undefined : new Date().toISOString() },
            timestamp: Date.now()
        };
        this.broadcast(message);
    }

    private broadcast(message: WebSocketMessage) {
        const str = JSON.stringify(message);
        this.connections.forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) ws.send(str);
        });
    }

    private send(ws: WebSocket, message: WebSocketMessage) {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
    }

    /**
     * Ping all connections to keep them alive through Render's proxy.
     * Render closes idle WebSocket connections after ~60 seconds.
     * We ping every 25 seconds to stay well under that limit.
     */
    private pingAllConnections() {
        const now = Date.now();
        this.connectionMetadata.forEach((meta, id) => {
            const ws = this.connections.get(id);
            if (!ws || ws.readyState !== WebSocket.OPEN) {
                this.removeConnection(id);
                return;
            }
            
            // Check if connection is stale (no pong received in 60 seconds)
            if (meta.lastPing && now - meta.lastPing > 60000) {
                console.log(`[WS] Connection ${id} stale, terminating`);
                ws.terminate();
                this.removeConnection(id);
                return;
            }
            
            // Send ping to keep connection alive
            ws.ping();
        });
    }

    /**
     * Get the current number of active connections (for health checks)
     */
    public getConnectionCount(): number {
        return this.connections.size;
    }
}
