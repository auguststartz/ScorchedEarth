// WebSocket message type definitions

export enum MessageType {
  PLAYER_CONNECT = 'PLAYER_CONNECT',
  REQUEST_AI_MATCH = 'REQUEST_AI_MATCH',
  MATCHMAKING_STATUS = 'MATCHMAKING_STATUS',
  GAME_START = 'GAME_START',
  GAME_STATE = 'GAME_STATE',
  PLAYER_ACTION = 'PLAYER_ACTION',
  PROJECTILE_UPDATE = 'PROJECTILE_UPDATE',
  EXPLOSION_EVENT = 'EXPLOSION_EVENT',
  TURN_END = 'TURN_END',
  GAME_OVER = 'GAME_OVER',
  CHAT_MESSAGE = 'CHAT_MESSAGE',
  PLAYER_DISCONNECT = 'PLAYER_DISCONNECT',
  PING = 'PING',
  PONG = 'PONG',
  ERROR = 'ERROR'
}

export interface BaseMessage {
  type: MessageType;
  timestamp: number;
}

export interface PlayerConnectMessage extends BaseMessage {
  type: MessageType.PLAYER_CONNECT;
  payload: {
    playerName: string;
  };
}

export interface RequestAIMatchMessage extends BaseMessage {
  type: MessageType.REQUEST_AI_MATCH;
  payload: {
    playerName: string;
    difficulty?: 'easy' | 'medium' | 'hard';
  };
}

export interface MatchmakingStatusMessage extends BaseMessage {
  type: MessageType.MATCHMAKING_STATUS;
  payload: {
    status: 'searching' | 'matched' | 'timeout' | 'cancelled';
    queuePosition?: number;
    estimatedWait?: number;
    message?: string;
  };
}

export interface GameStartMessage extends BaseMessage {
  type: MessageType.GAME_START;
  payload: {
    gameId: string;
    playerId: string; // The client's player ID
    players: Array<{
      id: string;
      name: string;
      type: 'human' | 'ai';
      position: { x: number; y: number };
      hp: number;
    }>;
    terrain: number[];
    wind: number;
    currentTurn: string;
  };
}

export interface GameStateMessage extends BaseMessage {
  type: MessageType.GAME_STATE;
  payload: {
    gameId: string;
    players: Array<{
      id: string;
      name: string;
      hp: number;
      position: { x: number; y: number };
      weapons: {
        standard: number;
        heavy: number;
        cluster: number;
        mirv: number;
        digger: number;
      };
    }>;
    terrain: number[];
    wind: number;
    currentTurn: string;
    turnTimeRemaining: number;
  };
}

export interface PlayerActionMessage extends BaseMessage {
  type: MessageType.PLAYER_ACTION;
  payload: {
    playerId: string;
    angle: number;
    power: number;
    weapon: 'standard' | 'heavy' | 'cluster' | 'mirv' | 'digger';
  };
}

export interface ProjectileUpdateMessage extends BaseMessage {
  type: MessageType.PROJECTILE_UPDATE;
  payload: {
    x: number;
    y: number;
    velocityX: number;
    velocityY: number;
  };
}

export interface ExplosionEventMessage extends BaseMessage {
  type: MessageType.EXPLOSION_EVENT;
  payload: {
    x: number;
    y: number;
    radius: number;
    damage: Array<{
      playerId: string;
      damageAmount: number;
      newHp: number;
    }>;
  };
}

export interface TurnEndMessage extends BaseMessage {
  type: MessageType.TURN_END;
  payload: {
    nextTurn: string;
    turnNumber: number;
  };
}

export interface GameOverMessage extends BaseMessage {
  type: MessageType.GAME_OVER;
  payload: {
    winner: {
      id: string;
      name: string;
    };
    statistics: {
      totalTurns: number;
      players: Array<{
        id: string;
        name: string;
        damageDealt: number;
        accuracy: number;
        shotsTotal: number;
        shotsHit: number;
      }>;
    };
  };
}

export interface ChatMessage extends BaseMessage {
  type: MessageType.CHAT_MESSAGE;
  payload: {
    playerId: string;
    playerName: string;
    message: string;
  };
}

export interface PlayerDisconnectMessage extends BaseMessage {
  type: MessageType.PLAYER_DISCONNECT;
  payload: {
    playerId: string;
    playerName: string;
    reason: string;
  };
}

export interface PingMessage extends BaseMessage {
  type: MessageType.PING;
}

export interface PongMessage extends BaseMessage {
  type: MessageType.PONG;
}

export interface ErrorMessage extends BaseMessage {
  type: MessageType.ERROR;
  payload: {
    code: string;
    message: string;
  };
}

export type WebSocketMessage =
  | PlayerConnectMessage
  | RequestAIMatchMessage
  | MatchmakingStatusMessage
  | GameStartMessage
  | GameStateMessage
  | PlayerActionMessage
  | ProjectileUpdateMessage
  | ExplosionEventMessage
  | TurnEndMessage
  | GameOverMessage
  | ChatMessage
  | PlayerDisconnectMessage
  | PingMessage
  | PongMessage
  | ErrorMessage;
