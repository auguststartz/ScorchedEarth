// Game state management

import type { ServerWebSocket } from 'bun';

export interface Player {
  id: string;
  name: string;
  type: 'human' | 'ai';
  socket: ServerWebSocket<any> | null;
  position: { x: number; y: number };
  hp: number;
  weapons: {
    standard: number;
    heavy: number;
    cluster: number;
    mirv: number;
    digger: number;
  };
  stats: {
    shotsTotal: number;
    shotsHit: number;
    damageDealt: number;
  };
}

export interface GameState {
  id: string;
  players: Player[];
  terrain: number[];
  wind: number;
  currentTurnIndex: number;
  turnNumber: number;
  turnStartTime: number;
  status: 'active' | 'completed';
  winner: string | null;
  createdAt: number;
}

export class GameStateManager {
  private games: Map<string, GameState> = new Map();

  createGame(
    gameId: string,
    players: Player[],
    terrain: number[],
    wind: number
  ): GameState {
    const game: GameState = {
      id: gameId,
      players,
      terrain,
      wind,
      currentTurnIndex: 0,
      turnNumber: 1,
      turnStartTime: Date.now(),
      status: 'active',
      winner: null,
      createdAt: Date.now()
    };

    this.games.set(gameId, game);
    return game;
  }

  getGame(gameId: string): GameState | null {
    return this.games.get(gameId) || null;
  }

  updateGame(gameId: string, updates: Partial<GameState>): void {
    const game = this.games.get(gameId);
    if (game) {
      Object.assign(game, updates);
    }
  }

  deleteGame(gameId: string): void {
    this.games.delete(gameId);
  }

  getActiveGamesCount(): number {
    return Array.from(this.games.values()).filter(g => g.status === 'active').length;
  }

  getAllGames(): GameState[] {
    return Array.from(this.games.values());
  }

  findGameByPlayerId(playerId: string): GameState | null {
    for (const game of this.games.values()) {
      if (game.players.some(p => p.id === playerId)) {
        return game;
      }
    }
    return null;
  }

  getCurrentPlayer(game: GameState): Player {
    return game.players[game.currentTurnIndex];
  }

  nextTurn(game: GameState): void {
    game.currentTurnIndex = (game.currentTurnIndex + 1) % game.players.length;
    game.turnNumber++;
    game.turnStartTime = Date.now();
  }

  updatePlayerHp(game: GameState, playerId: string, newHp: number): void {
    const player = game.players.find(p => p.id === playerId);
    if (player) {
      player.hp = Math.max(0, newHp);
    }
  }

  getAlivePlayers(game: GameState): Player[] {
    return game.players.filter(p => p.hp > 0);
  }

  checkGameOver(game: GameState): boolean {
    const alivePlayers = this.getAlivePlayers(game);

    if (alivePlayers.length <= 1) {
      game.status = 'completed';
      game.winner = alivePlayers.length === 1 ? alivePlayers[0].id : null;
      return true;
    }

    // Max turn limit
    if (game.turnNumber >= 50) {
      game.status = 'completed';
      // Winner is player with most HP
      const winner = game.players.reduce((prev, current) =>
        current.hp > prev.hp ? current : prev
      );
      game.winner = winner.id;
      return true;
    }

    return false;
  }
}
