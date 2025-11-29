import { createServer, IncomingMessage, ServerResponse } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketService } from './lib/services/websocket.service';
import { setWebSocketManager } from './lib/websocket-manager';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    const server = createServer(async (req, res) => {
        try {
            const parsedUrl = parse(req.url!, true);
            if (req.url?.startsWith('/api/ws')) {
                console.log('[Server] HTTP Request received for WebSocket path:', req.url);
            }
            await handle(req, res, parsedUrl);
        } catch (err) {
            console.error('Error occurred handling', req.url, err);
            res.statusCode = 500;
            res.end('internal server error');
        }
    });

    // Initialize WebSocket Service on a separate server to avoid Next.js conflicts
    const webSocketService = new WebSocketService();
    setWebSocketManager(webSocketService);

    // Create WebSocket server with internal broadcast endpoint
    const wsServer = createServer((req: IncomingMessage, res: ServerResponse) => {
        // Handle internal broadcast endpoint for cross-process communication
        if (req.method === 'POST' && req.url === '/internal/broadcast') {
            let body = '';
            req.on('data', (chunk) => { body += chunk; });
            req.on('end', () => {
                try {
                    const { userIds, message } = JSON.parse(body);
                    if (Array.isArray(userIds) && message) {
                        webSocketService.broadcastToUsers(userIds, message);
                        console.log('[WS Server] Internal broadcast to users:', userIds, 'type:', message.type);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true }));
                    } else {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Invalid payload' }));
                    }
                } catch (error) {
                    console.error('[WS Server] Internal broadcast error:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Internal error' }));
                }
            });
            return;
        }

        // Health check
        if (req.method === 'GET' && req.url === '/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok', connections: webSocketService.getConnectionCount?.() ?? 'unknown' }));
            return;
        }

        // Default: not found
        res.writeHead(404);
        res.end();
    });

    wsServer.on('upgrade', (request, socket, head) => {
        const { pathname } = parse(request.url || '', true);
        console.log(`[WS Server] Upgrade request for: ${pathname}`);

        if (pathname === '/api/ws') {
            webSocketService.handleUpgrade(request, socket, head);
        } else {
            socket.destroy();
        }
    });

    // Listen on port 3001 for WebSockets and internal HTTP
    wsServer.listen(3001, () => {
        console.log('> WebSocket server ready on ws://localhost:3001/api/ws');
        console.log('> Internal broadcast endpoint on http://localhost:3001/internal/broadcast');
    });

    server.listen(port, hostname, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
    });
});
