import 'dotenv/config';
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketService } from './lib/services/websocket.service';
import { setWebSocketManager } from './lib/websocket-manager';

const dev = process.env.NODE_ENV !== 'production';
// Use 0.0.0.0 in production to accept connections from any interface (required for Docker/Render)
const hostname = dev ? 'localhost' : '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    // Initialize WebSocket Service
    const webSocketService = new WebSocketService();
    setWebSocketManager(webSocketService);

    // Create a single HTTP server for both Next.js and WebSocket
    const server = createServer(async (req, res) => {
        try {
            const parsedUrl = parse(req.url!, true);

            // Handle internal broadcast endpoint (for cross-process communication)
            if (req.method === 'POST' && req.url === '/internal/broadcast') {
                let body = '';
                req.on('data', (chunk) => { body += chunk; });
                req.on('end', () => {
                    try {
                        const { userIds, message } = JSON.parse(body);
                        if (Array.isArray(userIds) && message) {
                            webSocketService.broadcastToUsers(userIds, message);
                            console.log('[Server] Internal broadcast to users:', userIds, 'type:', message.type);
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: true }));
                        } else {
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'Invalid payload' }));
                        }
                    } catch (error) {
                        console.error('[Server] Internal broadcast error:', error);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Internal error' }));
                    }
                });
                return;
            }

            // Health check endpoint
            if (req.method === 'GET' && req.url === '/health') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    status: 'ok',
                    wsConnections: webSocketService.getConnectionCount?.() ?? 'unknown',
                    environment: dev ? 'development' : 'production',
                }));
                return;
            }

            // All other requests go to Next.js
            await handle(req, res, parsedUrl);
        } catch (err) {
            console.error('Error occurred handling', req.url, err);
            res.statusCode = 500;
            res.end('internal server error');
        }
    });

    // Handle WebSocket upgrade requests on the SAME server
    server.on('upgrade', (request, socket, head) => {
        const { pathname } = parse(request.url || '', true);
        console.log(`[Server] WebSocket upgrade request for: ${pathname}`);

        if (pathname === '/api/ws') {
            webSocketService.handleUpgrade(request, socket, head);
        } else {
            console.log(`[Server] Rejecting WebSocket upgrade for unknown path: ${pathname}`);
            socket.destroy();
        }
    });

    // Start the unified server
    server.listen(port, hostname, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
        console.log(`> WebSocket available at ws://${hostname}:${port}/api/ws`);
        console.log(`> Environment: ${dev ? 'development' : 'production'}`);
    });
});
