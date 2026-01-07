// Simple file-based match history storage

import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger';

export interface MatchResult {
    timestamp: number;
    playerName: string;
    opponentName: string;
    opponentType: 'human' | 'ai';
    result: 'win' | 'loss' | 'draw';
    playerStats: {
        damageDealt: number;
        accuracy: number;
        shotsTotal: number;
        shotsHit: number;
        finalHp: number;
    };
    opponentStats: {
        finalHp: number;
    };
    totalTurns: number;
    aiDifficulty?: 'easy' | 'medium' | 'hard';
}

export interface PlayerHistory {
    playerName: string;
    totalGames: number;
    wins: number;
    losses: number;
    draws: number;
    recentMatches: MatchResult[];
}

export class MatchHistoryStorage {
    private readonly dataDir: string;
    private readonly dataFile: string;
    private history: Map<string, PlayerHistory>;

    constructor() {
        this.dataDir = join(process.cwd(), 'data');
        this.dataFile = join(this.dataDir, 'match-history.json');
        this.history = new Map();
    }

    async initialize(): Promise<void> {
        try {
            // Ensure data directory exists
            if (!existsSync(this.dataDir)) {
                await mkdir(this.dataDir, { recursive: true });
                logger.info('Created data directory', { path: this.dataDir });
            }

            // Load existing history if file exists
            if (existsSync(this.dataFile)) {
                const data = await readFile(this.dataFile, 'utf-8');
                const historyData = JSON.parse(data);

                // Convert array to Map
                for (const [name, history] of Object.entries(historyData)) {
                    this.history.set(name, history as PlayerHistory);
                }

                logger.info('Loaded match history', { totalPlayers: this.history.size });
            } else {
                logger.info('No existing match history found, starting fresh');
            }
        } catch (error) {
            logger.error('Failed to initialize match history', { error });
        }
    }

    async saveMatch(match: MatchResult): Promise<void> {
        try {
            const playerName = match.playerName.toLowerCase();

            // Get or create player history
            let playerHistory = this.history.get(playerName);
            if (!playerHistory) {
                playerHistory = {
                    playerName: match.playerName, // Keep original casing
                    totalGames: 0,
                    wins: 0,
                    losses: 0,
                    draws: 0,
                    recentMatches: []
                };
            }

            // Update stats
            playerHistory.totalGames++;
            if (match.result === 'win') {
                playerHistory.wins++;
            } else if (match.result === 'loss') {
                playerHistory.losses++;
            } else {
                playerHistory.draws++;
            }

            // Add to recent matches (keep last 10)
            playerHistory.recentMatches.unshift(match);
            if (playerHistory.recentMatches.length > 10) {
                playerHistory.recentMatches = playerHistory.recentMatches.slice(0, 10);
            }

            this.history.set(playerName, playerHistory);

            // Persist to disk
            await this.persist();

            logger.info('Match saved to history', {
                playerName: match.playerName,
                result: match.result,
                totalGames: playerHistory.totalGames
            });
        } catch (error) {
            logger.error('Failed to save match', { error, playerName: match.playerName });
        }
    }

    async getPlayerHistory(playerName: string): Promise<PlayerHistory | null> {
        const name = playerName.toLowerCase();
        return this.history.get(name) || null;
    }

    async getLeaderboard(limit: number = 10): Promise<PlayerHistory[]> {
        const allPlayers = Array.from(this.history.values());

        // Sort by win rate, then by total games
        return allPlayers
            .sort((a, b) => {
                const aWinRate = a.totalGames > 0 ? a.wins / a.totalGames : 0;
                const bWinRate = b.totalGames > 0 ? b.wins / b.totalGames : 0;

                if (Math.abs(aWinRate - bWinRate) > 0.001) {
                    return bWinRate - aWinRate;
                }

                return b.totalGames - a.totalGames;
            })
            .slice(0, limit);
    }

    private async persist(): Promise<void> {
        try {
            // Convert Map to object for JSON serialization
            const historyObject: Record<string, PlayerHistory> = {};
            for (const [name, history] of this.history.entries()) {
                historyObject[name] = history;
            }

            await writeFile(
                this.dataFile,
                JSON.stringify(historyObject, null, 2),
                'utf-8'
            );
        } catch (error) {
            logger.error('Failed to persist match history', { error });
        }
    }

    // Get total statistics
    getTotalStats(): { totalGames: number; totalPlayers: number } {
        let totalGames = 0;
        for (const history of this.history.values()) {
            totalGames += history.totalGames;
        }

        return {
            totalGames: Math.floor(totalGames / 2), // Divide by 2 since each game counts twice
            totalPlayers: this.history.size
        };
    }
}
