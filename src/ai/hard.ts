// Hard AI opponent

import { BaseAI, type AIDecision } from './base';
import type { GameState, Player } from '../game/state';
import { PhysicsEngine, type ProjectileConfig } from '../game/physics';

export class HardAI extends BaseAI {
    constructor() {
        super('hard');
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
                thinkingTime: Math.max(1000, this.getThinkingTime() * 0.5) // Faster thinking
            };
        }

        const distance = this.calculateDistance(aiPlayer, target);

        // Hard AI uses advanced trajectory calculation
        let bestAngle = 45;
        let bestPower = 50;
        let minError = Infinity;

        // Try multiple angles and powers to find the best shot
        for (let testAngle = 20; testAngle <= 160; testAngle += 10) {
            for (let testPower = 30; testPower <= 100; testPower += 10) {
                const config: ProjectileConfig = {
                    startX: aiPlayer.position.x,
                    startY: aiPlayer.position.y,
                    angle: testAngle,
                    power: testPower,
                    wind: game.wind
                };

                const trajectory = PhysicsEngine.calculateTrajectory(config);

                // Find impact point
                for (const point of trajectory) {
                    const xi = Math.floor(point.x);
                    if (xi >= 0 && xi < game.terrain.length) {
                        const terrainY = 600 - game.terrain[xi]; // Assuming 600px height
                        if (point.y >= terrainY) {
                            // Calculate error (distance to target)
                            const error = Math.sqrt(
                                Math.pow(point.x - target.position.x, 2) +
                                Math.pow(point.y - target.position.y, 2)
                            );

                            if (error < minError) {
                                minError = error;
                                bestAngle = testAngle;
                                bestPower = testPower;
                            }
                            break;
                        }
                    }
                }
            }
        }

        // Refine the best shot with finer adjustments
        for (let angleOffset = -5; angleOffset <= 5; angleOffset++) {
            for (let powerOffset = -5; powerOffset <= 5; powerOffset++) {
                const testAngle = bestAngle + angleOffset;
                const testPower = bestPower + powerOffset;

                if (testAngle < 0 || testAngle > 180 || testPower < 0 || testPower > 100) {
                    continue;
                }

                const config: ProjectileConfig = {
                    startX: aiPlayer.position.x,
                    startY: aiPlayer.position.y,
                    angle: testAngle,
                    power: testPower,
                    wind: game.wind
                };

                const trajectory = PhysicsEngine.calculateTrajectory(config);

                for (const point of trajectory) {
                    const xi = Math.floor(point.x);
                    if (xi >= 0 && xi < game.terrain.length) {
                        const terrainY = 600 - game.terrain[xi];
                        if (point.y >= terrainY) {
                            const error = Math.sqrt(
                                Math.pow(point.x - target.position.x, 2) +
                                Math.pow(point.y - target.position.y, 2)
                            );

                            if (error < minError) {
                                minError = error;
                                bestAngle = testAngle;
                                bestPower = testPower;
                            }
                            break;
                        }
                    }
                }
            }
        }

        let angle = bestAngle;
        let power = bestPower;

        // Hard AI has very high accuracy but not perfect (±3 degrees, ±5 power)
        ({ angle, power } = this.addRandomness(angle, power, 6, 10));

        // Occasionally make a bad shot to keep it fair (5% chance)
        if (Math.random() < 0.05) {
            angle += (Math.random() - 0.5) * 30;
            power += (Math.random() - 0.5) * 20;
            angle = Math.max(0, Math.min(180, angle));
            power = Math.max(0, Math.min(100, power));
        }

        // Intelligently select the best weapon
        const weapon = this.selectBestWeapon(aiPlayer, distance, minError);

        return {
            angle,
            power,
            weapon,
            thinkingTime: Math.max(1000, this.getThinkingTime() * 0.5) // Faster thinking
        };
    }

    private selectBestWeapon(
        aiPlayer: Player,
        distance: number,
        accuracy: number
    ): 'standard' | 'heavy' | 'cluster' | 'mirv' | 'digger' {
        // If very close and accurate, use heavy for maximum damage
        if (accuracy < 30 && distance < 400 && aiPlayer.weapons.heavy > 0) {
            return 'heavy';
        }

        // If medium distance and less accurate, use cluster for area coverage
        if (accuracy > 30 && accuracy < 100 && aiPlayer.weapons.cluster > 0) {
            return 'cluster';
        }

        // If medium-long distance, use MIRV
        if (distance > 400 && aiPlayer.weapons.mirv > 0) {
            return 'mirv';
        }

        // If very accurate and target might be behind terrain, use digger
        if (accuracy < 20 && aiPlayer.weapons.digger > 0 && Math.random() < 0.3) {
            return 'digger';
        }

        // Default to standard shell if low on special ammo
        return 'standard';
    }
}
