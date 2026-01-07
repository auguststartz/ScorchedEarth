// Easy AI opponent

import { BaseAI, type AIDecision } from './base';
import type { GameState, Player } from '../game/state';

export class EasyAI extends BaseAI {
    constructor() {
        super('easy');
    }

    makeDecision(
        game: GameState,
        aiPlayer: Player,
        targets: Player[]
    ): AIDecision {
        const target = this.findNearestTarget(aiPlayer, targets);

        if (!target) {
            // No valid target, shoot randomly
            return {
                angle: Math.random() * 180,
                power: 50 + Math.random() * 50,
                weapon: 'standard',
                thinkingTime: this.getThinkingTime()
            };
        }

        const distance = this.calculateDistance(aiPlayer, target);

        // Calculate basic shot (ignore wind 100% of the time)
        let { angle, power } = this.calculateBasicShot(
            aiPlayer.position.x,
            aiPlayer.position.y,
            target.position.x,
            target.position.y,
            game.wind,
            false // Don't account for wind
        );

        // Easy AI has poor accuracy (±25 degrees, ±30 power)
        ({ angle, power } = this.addRandomness(angle, power, 50, 60));

        // Occasionally shoot in completely wrong direction (10% chance)
        if (Math.random() < 0.1) {
            angle = Math.random() * 180;
            power = Math.random() * 100;
        }

        // Always use standard shell (never use special weapons effectively)
        const weapon = 'standard';

        return {
            angle,
            power,
            weapon,
            thinkingTime: this.getThinkingTime()
        };
    }
}
