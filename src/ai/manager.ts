// AI Manager for handling AI player turns

import { logger } from '../utils/logger';
import type { GameState, Player } from '../game/state';
import { EasyAI } from './easy';
import { MediumAI } from './medium';
import { HardAI } from './hard';
import type { BaseAI } from './base';

export type AIDifficulty = 'easy' | 'medium' | 'hard';

export class AIManager {
    private ais: Map<string, BaseAI> = new Map();

    constructor() {}

    registerAI(playerId: string, difficulty: AIDifficulty = 'medium'): void {
        let ai: BaseAI;

        switch (difficulty) {
            case 'easy':
                ai = new EasyAI();
                break;
            case 'hard':
                ai = new HardAI();
                break;
            case 'medium':
            default:
                ai = new MediumAI();
                break;
        }

        this.ais.set(playerId, ai);
        logger.info('AI registered', { playerId, difficulty });
    }

    isAI(playerId: string): boolean {
        return this.ais.has(playerId);
    }

    async executeAITurn(
        game: GameState,
        aiPlayerId: string,
        onAction: (playerId: string, angle: number, power: number, weapon: string) => void
    ): Promise<void> {
        const ai = this.ais.get(aiPlayerId);
        if (!ai) {
            logger.error('AI not found', { aiPlayerId });
            return;
        }

        const aiPlayer = game.players.find(p => p.id === aiPlayerId);
        if (!aiPlayer) {
            logger.error('AI player not found in game', { aiPlayerId });
            return;
        }

        // Get all alive targets
        const targets = game.players.filter(p => p.id !== aiPlayerId && p.hp > 0);

        if (targets.length === 0) {
            logger.info('No targets available for AI');
            return;
        }

        // Get AI decision
        const decision = ai.makeDecision(game, aiPlayer, targets);

        logger.info('AI decision made', {
            aiPlayerId,
            angle: decision.angle,
            power: decision.power,
            weapon: decision.weapon,
            thinkingTime: decision.thinkingTime
        });

        // Wait for thinking time to simulate human-like behavior
        await new Promise(resolve => setTimeout(resolve, decision.thinkingTime));

        // Execute action
        onAction(aiPlayerId, decision.angle, decision.power, decision.weapon);
    }

    unregisterAI(playerId: string): void {
        this.ais.delete(playerId);
        logger.info('AI unregistered', { playerId });
    }

    clear(): void {
        this.ais.clear();
    }
}
