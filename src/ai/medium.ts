// Medium AI opponent

import { BaseAI, type AIDecision } from './base';
import type { GameState, Player } from '../game/state';

export class MediumAI extends BaseAI {
    constructor() {
        super('medium');
    }

    makeDecision(
        game: GameState,
        aiPlayer: Player,
        targets: Player[]
    ): AIDecision {
        const target = this.findNearestTarget(aiPlayer, targets);

        if (!target) {
            return {
                angle: 45,
                power: 50,
                weapon: 'standard',
                thinkingTime: this.getThinkingTime()
            };
        }

        const distance = this.calculateDistance(aiPlayer, target);

        // Calculate basic shot
        // Ignore wind 30% of the time (medium difficulty weakness)
        const accountForWind = Math.random() > 0.3;
        let { angle, power } = this.calculateBasicShot(
            aiPlayer.position.x,
            aiPlayer.position.y,
            target.position.x,
            target.position.y,
            game.wind,
            accountForWind
        );

        // Medium AI has moderate accuracy (±10 degrees, ±15 power)
        ({ angle, power } = this.addRandomness(angle, power, 20, 30));

        // Occasionally make a bad shot (5% chance)
        if (Math.random() < 0.05) {
            angle += (Math.random() - 0.5) * 60;
            power += (Math.random() - 0.5) * 50;
            angle = Math.max(0, Math.min(180, angle));
            power = Math.max(0, Math.min(100, power));
        }

        // Select appropriate weapon based on distance
        const weapon = this.selectWeapon(aiPlayer, distance);

        return {
            angle,
            power,
            weapon,
            thinkingTime: this.getThinkingTime()
        };
    }
}
