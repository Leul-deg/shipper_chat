import { createServer } from 'http';
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
    const wsServer = createServer();
    const webSocketService = new WebSocketService();
    setWebSocketManager(webSocketService);

    wsServer.on('upgrade', (request, socket, head) => {
        const { pathname } = parse(request.url || '', true);
        console.log(`[WS Server] Upgrade request for: ${pathname}`);

        if (pathname === '/api/ws') {
            webSocketService.handleUpgrade(request, socket, head);
        } else {
            socket.destroy();
        }
    });

    // Listen on port 3001 for WebSockets
    wsServer.listen(3001, () => {
        console.log('> WebSocket server ready on ws://localhost:3001/api/ws');
    });

    server.listen(port, hostname, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
    });
});
