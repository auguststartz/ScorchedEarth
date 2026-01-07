// Matchmaking queue management

import { logger } from '../utils/logger';
import type { ServerWebSocket } from 'bun';
import type { CustomGameSettings } from '../game/config';

export interface QueuedPlayer {
  id: string;
  name: string;
  socket: ServerWebSocket<any>;
  joinedAt: number;
  timeoutNotified: boolean;
  customSettings?: CustomGameSettings;
}

export class MatchmakingQueue {
  private queue: QueuedPlayer[] = [];
  private readonly TIMEOUT_INITIAL = 30000; // 30 seconds
  private readonly TIMEOUT_EXTENDED = 60000; // 60 seconds additional

  addPlayer(player: QueuedPlayer): void {
    this.queue.push(player);
    logger.info('Player added to queue', {
      playerId: player.id,
      playerName: player.name,
      queueSize: this.queue.length
    });
  }

  removePlayer(playerId: string): QueuedPlayer | null {
    const index = this.queue.findIndex(p => p.id === playerId);
    if (index === -1) return null;

    const player = this.queue[index];
    this.queue.splice(index, 1);
    logger.info('Player removed from queue', {
      playerId,
      queueSize: this.queue.length
    });
    return player;
  }

  getPlayer(playerId: string): QueuedPlayer | null {
    return this.queue.find(p => p.id === playerId) || null;
  }

  getQueuePosition(playerId: string): number {
    const index = this.queue.findIndex(p => p.id === playerId);
    return index === -1 ? -1 : index + 1;
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  findMatch(): [QueuedPlayer, QueuedPlayer] | null {
    // Simple FIFO matching - take the first two players
    if (this.queue.length < 2) return null;

    const player1 = this.queue.shift()!;
    const player2 = this.queue.shift()!;

    logger.info('Match found', {
      player1Id: player1.id,
      player1Name: player1.name,
      player2Id: player2.id,
      player2Name: player2.name
    });

    return [player1, player2];
  }

  checkTimeouts(): QueuedPlayer[] {
    const now = Date.now();
    const playersToNotify: QueuedPlayer[] = [];

    for (const player of this.queue) {
      const waitTime = now - player.joinedAt;

      // First timeout (30 seconds) - notify player
      if (!player.timeoutNotified && waitTime >= this.TIMEOUT_INITIAL) {
        player.timeoutNotified = true;
        playersToNotify.push(player);
        logger.info('Player timeout notification', {
          playerId: player.id,
          waitTime
        });
      }

      // Extended timeout (90 seconds total) - auto-start with AI
      if (player.timeoutNotified && waitTime >= this.TIMEOUT_INITIAL + this.TIMEOUT_EXTENDED) {
        playersToNotify.push(player);
      }
    }

    return playersToNotify;
  }

  clear(): void {
    this.queue = [];
  }

  getAllPlayers(): QueuedPlayer[] {
    return [...this.queue];
  }
}
