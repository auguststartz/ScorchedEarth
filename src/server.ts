// Main Bun server with Elysia.js

import { Elysia } from 'elysia';
import { logger } from './utils/logger';
import { WebSocketHandler, type WebSocketData } from './websocket/handler';

const PORT = process.env.PORT || 3000;
const wsHandler = new WebSocketHandler();

const app = new Elysia()
  .get('/', () => Bun.file('public/index.html'))
  .get('/game', () => Bun.file('public/game.html'))

  // Serve static files
  .get('/css/:file', ({ params: { file } }) => Bun.file(`public/css/${file}`))
  .get('/js/:file', ({ params: { file } }) => Bun.file(`public/js/${file}`))
  .get('/assets/sounds/:file', ({ params: { file } }) => Bun.file(`public/assets/sounds/${file}`))
  .get('/assets/images/:file', ({ params: { file } }) => Bun.file(`public/assets/images/${file}`))

  // Health check endpoint
  .get('/health', () => {
    const stats = wsHandler.getStats();
    return {
      status: 'healthy',
      uptime: process.uptime(),
      activeGames: stats.activeGames,
      queueSize: stats.queueSize,
      timestamp: Date.now()
    };
  })

  // WebSocket endpoint
  .ws('/ws', {
    open(ws) {
      logger.info('WS open handler called');
      wsHandler.handleConnection(ws);
    },
    message(ws, message) {
      logger.info('WS message handler called', { messageType: typeof message });
      // Bun WebSocket can auto-parse JSON, so handle both string and object
      if (typeof message === 'string') {
        wsHandler.handleMessage(ws, message);
      } else if (typeof message === 'object') {
        // Message already parsed by Bun, stringify it for handleMessage
        wsHandler.handleMessage(ws, JSON.stringify(message));
      } else {
        logger.warn('Received unsupported message type', { messageType: typeof message });
      }
    },
    close(ws) {
      logger.info('WS close handler called');
      wsHandler.handleClose(ws);
    },
    // WebSocket error handling
    error(ws, error) {
      logger.error('WebSocket error', { error });
    },
    // Heartbeat configuration
    perMessageDeflate: true,
    idleTimeout: 120, // 2 minutes idle timeout
    maxPayloadLength: 16 * 1024, // 16KB max message size
  })

  .listen(PORT);

logger.info('Scorched Earth server started', {
  port: PORT,
  environment: process.env.NODE_ENV || 'development'
});

console.log(`🚀 Server running at http://localhost:${PORT}`);

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down server...');
  wsHandler.shutdown();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Shutting down server...');
  wsHandler.shutdown();
  process.exit(0);
});