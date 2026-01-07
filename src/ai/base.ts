// Base AI opponent logic

import type { GameState, Player } from '../game/state';
import type { WeaponType } from '../game/weapons';
import { PhysicsEngine, type ProjectileConfig } from '../game/physics';

export interface AIDecision {
    angle: number;
    power: number;
    weapon: WeaponType;
    thinkingTime: number;
}

export abstract class BaseAI {
    protected difficulty: 'easy' | 'medium' | 'hard';

    constructor(difficulty: 'easy' | 'medium' | 'hard') {
        this.difficulty = difficulty;
    }

    abstract makeDecision(
        game: GameState,
        aiPlayer: Player,
        targets: Player[]
    ): AIDecision;

    protected calculateBasicShot(
        aiX: number,
        aiY: number,
        targetX: number,
        targetY: number,
        wind: number,
        accountForWind: boolean = true
    ): { angle: number; power: number } {
        const dx = targetX - aiX;
        const dy = aiY - targetY; // Inverted Y (canvas coords)
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Calculate ideal angle
        let angle = Math.atan2(dy, dx) * (180 / Math.PI);

        // Adjust for wind if configured
        if (accountForWind) {
            const windAdjustment = wind * 2;
            angle += windAdjustment;
        }

        // Ensure angle is within valid range
        angle = Math.max(0, Math.min(180, angle));

        // Calculate power based on distance
        // Longer distances require more power
        const power = Math.min(100, (distance / 600) * 100);

        return { angle, power };
    }

    protected selectWeapon(
        aiPlayer: Player,
        distance: number
    ): WeaponType {
        // Select weapon based on distance and available ammo

        // Prefer heavy missile for long distances
        if (distance > 500 && aiPlayer.weapons.heavy > 0) {
            return 'heavy';
        }

        // Use cluster bomb for medium distances
        if (distance > 300 && distance < 500 && aiPlayer.weapons.cluster > 0) {
            return 'cluster';
        }

        // Use MIRV for grouped targets or medium range
        if (distance > 200 && distance < 600 && aiPlayer.weapons.mirv > 0) {
            return 'mirv';
        }

        // Use digger if target is behind terrain
        if (aiPlayer.weapons.digger > 0 && Math.random() < 0.2) {
            return 'digger';
        }

        // Default to standard shell
        return 'standard';
    }

    protected addRandomness(
        angle: number,
        power: number,
        angleVariance: number,
        powerVariance: number
    ): { angle: number; power: number } {
        const angleNoise = (Math.random() - 0.5) * angleVariance;
        const powerNoise = (Math.random() - 0.5) * powerVariance;

        return {
            angle: Math.max(0, Math.min(180, angle + angleNoise)),
            power: Math.max(0, Math.min(100, power + powerNoise))
        };
    }

    protected getThinkingTime(): number {
        // Simulate human-like thinking time
        const baseTime = 2000; // 2 seconds base
        const randomTime = Math.random() * 2000; // Up to 2 more seconds
        return baseTime + randomTime;
    }

    protected findNearestTarget(
        aiPlayer: Player,
        targets: Player[]
    ): Player | null {
        if (targets.length === 0) return null;

        let nearestTarget = targets[0];
        let minDistance = this.calculateDistance(aiPlayer, nearestTarget);

        for (const target of targets) {
            const distance = this.calculateDistance(aiPlayer, target);
            if (distance < minDistance) {
                minDistance = distance;
                nearestTarget = target;
            }
        }

        return nearestTarget;
    }

    protected calculateDistance(player1: Player, player2: Player): number {
        const dx = player2.position.x - player1.position.x;
        const dy = player2.position.y - player1.position.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    protected testTrajectory(
        config: ProjectileConfig,
        terrain: number[],
        canvasHeight: number,
        targetX: number,
        targetY: number,
        acceptableDistance: number
    ): boolean {
        const trajectory = PhysicsEngine.calculateTrajectory(config);

        for (const point of trajectory) {
            const xi = Math.floor(point.x);

            // Check if projectile hits terrain
            if (xi >= 0 && xi < terrain.length) {
                const terrainY = canvasHeight - terrain[xi];
                if (point.y >= terrainY) {
                    // Impact point
                    const distanceToTarget = Math.sqrt(
                        Math.pow(point.x - targetX, 2) +
                        Math.pow(point.y - targetY, 2)
                    );

                    return distanceToTarget <= acceptableDistance;
                }
            }

            // Check out of bounds
            if (point.x < 0 || point.x > terrain.length || point.y > canvasHeight) {
                return false;
            }
        }

        return false;
    }
}
