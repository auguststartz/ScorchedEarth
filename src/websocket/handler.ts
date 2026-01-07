// WebSocket connection handling

import type { ServerWebSocket } from 'bun';
import { logger } from '../utils/logger';
import { Validator } from '../utils/validator';
import { MessageTypes } from './message-types';
import { MatchmakingQueue, type QueuedPlayer } from '../matchmaking/queue';
import { GameEngine } from '../game/engine';
import type { CustomGameSettings } from '../game/config';

export interface WebSocketData {
  playerId: string;
  playerName: string;
  authenticated: boolean;
}

export class WebSocketHandler {
  private queue: MatchmakingQueue;
  private gameEngine: GameEngine;
  private heartbeatInterval: Timer | null = null;
  private queueCheckInterval: Timer | null = null;

  constructor(matchHistory?: any) {
    this.queue = new MatchmakingQueue();
    this.gameEngine = new GameEngine(undefined, matchHistory);
    this.startHeartbeat();
    this.startQueueMonitor();
  }

  private startHeartbeat(): void {
    // Send ping every 10 seconds to maintain connections
    this.heartbeatInterval = setInterval(() => {
      // This will be implemented when we have active connections tracking
    }, 10000);
  }

  private startQueueMonitor(): void {
    // Check for matches and timeouts every 1 second
    this.queueCheckInterval = setInterval(() => {
      this.processMatchmaking();
    }, 1000);
  }

  private processMatchmaking(): void {
    // Try to find matches
    const match = this.queue.findMatch();
    if (match) {
      const [player1, player2] = match;
      this.startGame([player1, player2]);
    }

    // Check for timeouts
    const timedOutPlayers = this.queue.checkTimeouts();
    for (const player of timedOutPlayers) {
      const waitTime = Date.now() - player.joinedAt;
      if (waitTime >= 90000) {
        // Auto-start with AI (default medium difficulty)
        this.queue.removePlayer(player.id);
        this.startGameWithAI(player, 'medium');
      } else if (!player.timeoutNotified) {
        // Send timeout notification
        this.sendTimeoutNotification(player);
      }
    }
  }

  private startGame(players: QueuedPlayer[]): void {
    logger.info('Starting game', {
      players: players.map(p => ({ id: p.id, name: p.name }))
    });

    const gameId = crypto.randomUUID();

    // Use first player's custom settings for the game
    const customSettings = players[0].customSettings;

    // Create game using engine
    const game = this.gameEngine.createGame(
      gameId,
      players.map(p => ({
        id: p.id,
        name: p.name,
        type: 'human' as const,
        socket: p.socket
      })),
      customSettings
    );

    // Send GAME_START message to all players
    for (const player of players) {
      this.send(player.socket, {
        type: MessageTypes.GAME_START,
        timestamp: Date.now(),
        payload: {
          gameId: game.id,
          playerId: player.id, // Tell each client their player ID
          players: game.players.map(p => ({
            id: p.id,
            name: p.name,
            type: p.type,
            position: p.position,
            hp: p.hp
          })),
          terrain: game.terrain,
          wind: game.wind,
          currentTurn: game.players[0].id
        }
      });
    }
  }

  private startGameWithAI(player: QueuedPlayer, difficulty: 'easy' | 'medium' | 'hard' = 'medium'): void {
    try {
      logger.info('Starting game with AI', { playerId: player.id, playerName: player.name, difficulty });

      const gameId = crypto.randomUUID();

      logger.info('Creating game with AI opponent', { gameId, difficulty });

      // Set AI name based on difficulty
      const aiNames = {
        easy: 'CPU-Novice',
        medium: 'CPU-Alpha',
        hard: 'CPU-Elite'
      };

      // Create game with AI opponent
      const game = this.gameEngine.createGame(
        gameId,
        [
          {
            id: player.id,
            name: player.name,
            type: 'human' as const,
            socket: player.socket
          },
          {
            id: 'ai-' + crypto.randomUUID(),
            name: aiNames[difficulty],
            type: 'ai' as const,
            socket: null,
            aiDifficulty: difficulty
          }
        ],
        player.customSettings
      );

      logger.info('Game created successfully, sending GAME_START message', { gameId });

      this.send(player.socket, {
        type: MessageTypes.GAME_START,
        timestamp: Date.now(),
        payload: {
          gameId: game.id,
          playerId: player.id, // Tell client their player ID
          players: game.players.map(p => ({
            id: p.id,
            name: p.name,
            type: p.type,
            position: p.position,
            hp: p.hp
          })),
          terrain: game.terrain,
          wind: game.wind,
          currentTurn: game.players[0].id
        }
      });

      logger.info('GAME_START message sent to player', { playerId: player.id });
    } catch (error) {
      logger.error('Error in startGameWithAI', { error });
      // Send error to client
      this.send(player.socket, {
        type: MessageTypes.ERROR,
        timestamp: Date.now(),
        payload: {
          code: 'GAME_START_FAILED',
          message: 'Failed to start game with AI'
        }
      });
    }
  }

  private sendTimeoutNotification(player: QueuedPlayer): void {
    this.send(player.socket, {
      type: MessageTypes.MATCHMAKING_STATUS,
      timestamp: Date.now(),
      payload: {
        status: 'timeout',
        message: 'No opponent found. Would you like to play vs Computer or keep waiting?'
      }
    });
  }

  handleConnection(ws: ServerWebSocket<WebSocketData>): void {
    logger.info('New WebSocket connection');
    // Initialize WebSocket data
    ws.data = ws.data || { playerId: '', playerName: '', authenticated: false };
  }

  handleMessage(ws: ServerWebSocket<WebSocketData>, message: string): void {
    try {
      logger.info('Attempting to parse message...');
      const data = JSON.parse(message);
      logger.info('Received message', { type: data.type, payload: data.payload });

      switch (data.type) {
        case MessageTypes.MATCHMAKING_REQUEST:
          logger.info('Handling matchmaking request...');
          this.handleMatchmakingRequest(ws, data);
          break;

        case MessageTypes.PLAY_VS_COMPUTER:
          logger.info('Handling play vs computer request...');
          this.handlePlayVsComputer(ws, data);
          break;

        case MessageTypes.REJOIN_GAME:
          logger.info('Handling rejoin game request...');
          this.handleRejoinGame(ws, data);
          break;

        case MessageTypes.PLAYER_ACTION:
          logger.info('Handling player action...');
          this.handlePlayerAction(ws, data);
          break;

        case MessageTypes.CHAT_MESSAGE:
          logger.info('Handling chat message...');
          this.handleChatMessage(ws, data);
          break;

        default:
          logger.warn('Unknown message type', { type: data.type });
      }
    } catch (error) {
      logger.error('Error handling message', { error });
      this.send(ws, {
        type: MessageTypes.ERROR,
        timestamp: Date.now(),
        payload: {
          code: 'INVALID_MESSAGE',
          message: 'Failed to process message'
        }
      });
    }
  }

  private handleMatchmakingRequest(
    ws: ServerWebSocket<WebSocketData>,
    data: any
  ): void {
    const { playerName, customSettings } = data.payload;

    const validation = Validator.validatePlayerName(playerName);
    if (!validation.valid) {
      this.send(ws, {
        type: MessageTypes.ERROR,
        timestamp: Date.now(),
        payload: {
          code: 'INVALID_PLAYER_NAME',
          message: validation.error!
        }
      });
      return;
    }

    const playerId = crypto.randomUUID();
    ws.data.playerId = playerId;
    ws.data.playerName = playerName;
    ws.data.authenticated = true;

    // Add to matchmaking queue
    this.queue.addPlayer({
      id: playerId,
      name: playerName,
      socket: ws,
      joinedAt: Date.now(),
      timeoutNotified: false,
      customSettings: customSettings
    });

    // Send matchmaking status
    this.send(ws, {
      type: MessageTypes.MATCHMAKING_STATUS,
      timestamp: Date.now(),
      payload: {
        status: 'searching',
        queuePosition: this.queue.getQueuePosition(playerId),
        message: 'Searching for opponent...'
      }
    });

    logger.info('Player added to queue', { playerId, playerName });
  }

  private handleRejoinGame(
    ws: ServerWebSocket<WebSocketData>,
    data: any
  ): void {
    try {
      const { playerId, gameId } = data.payload;

      logger.info('Player rejoining game', { playerId, gameId });

      // Find the game
      const game = this.gameEngine.getGameManager().getGame(gameId);
      if (!game) {
        logger.error('Game not found for rejoin', { gameId });
        this.send(ws, {
          type: MessageTypes.ERROR,
          timestamp: Date.now(),
          payload: {
            code: 'GAME_NOT_FOUND',
            message: 'Game not found'
          }
        });
        return;
      }

      // Find the player in the game
      const player = game.players.find(p => p.id === playerId);
      if (!player) {
        logger.error('Player not found in game', { playerId, gameId });
        this.send(ws, {
          type: MessageTypes.ERROR,
          timestamp: Date.now(),
          payload: {
            code: 'PLAYER_NOT_FOUND',
            message: 'Player not found in game'
          }
        });
        return;
      }

      // Update the player's socket to the new WebSocket connection
      player.socket = ws;

      // Update WebSocket data
      ws.data.playerId = playerId;
      ws.data.playerName = player.name;
      ws.data.authenticated = true;

      logger.info('Player successfully rejoined game', { playerId, gameId });

      // Send current game state to the reconnected player
      this.send(ws, {
        type: MessageTypes.GAME_STATE,
        timestamp: Date.now(),
        payload: {
          gameId: game.id,
          players: game.players.map(p => ({
            id: p.id,
            name: p.name,
            hp: p.hp,
            position: p.position,
            weapons: p.weapons
          })),
          terrain: game.terrain,
          wind: game.wind,
          currentTurn: this.gameEngine.getGameManager().getCurrentPlayer(game).id,
          turnTimeRemaining: 45 // TODO: Calculate actual remaining time
        }
      });
    } catch (error) {
      logger.error('Error in handleRejoinGame', { error });
      this.send(ws, {
        type: MessageTypes.ERROR,
        timestamp: Date.now(),
        payload: {
          code: 'REJOIN_FAILED',
          message: 'Failed to rejoin game'
        }
      });
    }
  }

  private handlePlayVsComputer(
    ws: ServerWebSocket<WebSocketData>,
    data: any
  ): void {
    try {
      const { playerName, difficulty, customSettings } = data.payload;

      const validation = Validator.validatePlayerName(playerName);
      if (!validation.valid) {
        this.send(ws, {
          type: MessageTypes.ERROR,
          timestamp: Date.now(),
          payload: {
            code: 'INVALID_PLAYER_NAME',
            message: validation.error!
          }
        });
        return;
      }

      const playerId = crypto.randomUUID();
      ws.data.playerId = playerId;
      ws.data.playerName = playerName;
      ws.data.authenticated = true;

      // Validate difficulty
      const validDifficulty = ['easy', 'medium', 'hard'].includes(difficulty)
        ? difficulty as 'easy' | 'medium' | 'hard'
        : 'medium';

      logger.info('Play vs. Computer requested', { playerId, playerName, difficulty: validDifficulty });

      // Immediately start game with AI (don't add to queue)
      this.startGameWithAI({
        id: playerId,
        name: playerName,
        socket: ws,
        joinedAt: Date.now(),
        timeoutNotified: false,
        customSettings: customSettings
      }, validDifficulty);
    } catch (error) {
      logger.error('Error in handlePlayVsComputer', { error });
      // Send error to client so they know what happened
      this.send(ws, {
        type: MessageTypes.ERROR,
        timestamp: Date.now(),
        payload: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to start game with AI'
        }
      });
    }
  }

  private handlePlayerAction(
    ws: ServerWebSocket<WebSocketData>,
    data: any
  ): void {
    const { playerId } = ws.data;
    const { angle, power, weapon } = data.payload;

    // Validate input
    const angleValidation = Validator.validateAngle(angle);
    const powerValidation = Validator.validatePower(power);
    const weaponValidation = Validator.validateWeapon(weapon);

    if (!angleValidation.valid || !powerValidation.valid || !weaponValidation.valid) {
      this.send(ws, {
        type: MessageTypes.ERROR,
        timestamp: Date.now(),
        payload: {
          code: 'INVALID_ACTION',
          message: angleValidation.error || powerValidation.error || weaponValidation.error!
        }
      });
      return;
    }

    // Find player's game
    const game = this.gameEngine.getGameManager().findGameByPlayerId(playerId);
    if (!game) {
      logger.error('Game not found for player', { playerId });
      return;
    }

    // Process player action through game engine
    this.gameEngine.processPlayerAction(game.id, playerId, angle, power, weapon);
  }

  private handleChatMessage(
    ws: ServerWebSocket<WebSocketData>,
    data: any
  ): void {
    const { playerId, playerName } = ws.data;
    const { message } = data.payload;

    const validation = Validator.validateChatMessage(message);
    if (!validation.valid) {
      this.send(ws, {
        type: MessageTypes.ERROR,
        timestamp: Date.now(),
        payload: {
          code: 'INVALID_MESSAGE',
          message: validation.error!
        }
      });
      return;
    }

    const sanitizedMessage = Validator.sanitizeChatMessage(message);

    // Broadcast to all players in the same game
    // This will be implemented when we have game rooms
    logger.info('Chat message', { playerId, playerName, message: sanitizedMessage });
  }

  handleClose(ws: ServerWebSocket<WebSocketData>): void {
    const { playerId, playerName } = ws.data;

    if (playerId) {
      // Remove from queue if still in queue
      this.queue.removePlayer(playerId);

      // Handle in-game disconnect
      const game = this.gameEngine.getGameManager().findGameByPlayerId(playerId);
      if (game) {
        // Notify other players
        for (const player of game.players) {
          if (player.id !== playerId && player.socket) {
            this.send(player.socket, {
              type: MessageTypes.PLAYER_DISCONNECT,
              timestamp: Date.now(),
              payload: {
                playerId,
                playerName: playerName || 'Unknown',
                reason: 'Connection lost'
              }
            });
          }
        }
      }

      logger.info('Player disconnected', { playerId, playerName });
    }
  }

  private send(ws: ServerWebSocket<any>, message: any): void {
    try {
      ws.send(JSON.stringify(message));
    } catch (error) {
      logger.error('Error sending message', { error });
    }
  }

  getStats(): { queueSize: number; activeGames: number } {
    return {
      queueSize: this.queue.getQueueSize(),
      activeGames: this.gameEngine.getGameManager().getActiveGamesCount()
    };
  }

  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.queueCheckInterval) {
      clearInterval(this.queueCheckInterval);
    }
  }
}
