// Physics engine for projectile motion

export interface TrajectoryPoint {
    x: number;
    y: number;
    vx: number;
    vy: number;
    t: number;
}

export interface ProjectileConfig {
    startX: number;
    startY: number;
    angle: number;      // degrees (0-180)
    power: number;      // percentage (0-100)
    wind: number;       // force (-20 to +20)
    gravity?: number;   // m/s² (default 9.8)
    dt?: number;        // time step (default 0.016 for 60 FPS)
}

export class PhysicsEngine {
    public static readonly DEFAULT_GRAVITY = 980; // pixels per second squared (scaled for game)
    private static readonly DEFAULT_DT = 0.016; // 60 FPS (16ms)
    private static readonly MAX_VELOCITY = 800; // pixels per second

    static calculateTrajectory(config: ProjectileConfig): TrajectoryPoint[] {
        const {
            startX,
            startY,
            angle,
            power,
            wind,
            gravity = PhysicsEngine.DEFAULT_GRAVITY,
            dt = PhysicsEngine.DEFAULT_DT
        } = config;

        const angleRad = (angle * Math.PI) / 180;
        const initialVelocity = (power / 100) * PhysicsEngine.MAX_VELOCITY;
        const vx0 = initialVelocity * Math.cos(angleRad);
        const vy0 = -initialVelocity * Math.sin(angleRad); // Negative because Y increases downward

        const points: TrajectoryPoint[] = [];
        let t = 0;
        let x = startX;
        let y = startY;
        let vx = vx0;
        let vy = vy0;

        const maxTime = 10; // Maximum 10 seconds flight time
        const maxIterations = Math.floor(maxTime / dt);

        for (let i = 0; i < maxIterations; i++) {
            points.push({ x, y, vx, vy, t });

            // Apply wind force (affects horizontal velocity)
            vx += wind * 0.05 * dt;

            // Apply gravity (affects vertical velocity)
            vy += gravity * dt;

            // Update position
            x += vx * dt;
            y += vy * dt;

            t += dt;

            // Stop if projectile goes way off screen (optimization)
            if (y > 1000 || x < -500 || x > 2000) {
                break;
            }
        }

        return points;
    }

    static calculateImpactAngle(vx: number, vy: number): number {
        return Math.atan2(vy, vx) * (180 / Math.PI);
    }

    static calculateDamage(
        impactVelocity: number,
        distance: number,
        weaponDamage: number,
        splashRadius: number
    ): number {
        // Base damage from weapon
        let damage = weaponDamage;

        // Velocity bonus (faster impact = more damage)
        const velocityMagnitude = Math.sqrt(impactVelocity);
        const velocityBonus = Math.min(1.5, velocityMagnitude / 20);
        damage *= velocityBonus;

        // Distance falloff for splash damage
        if (distance > 0) {
            const falloff = Math.max(0, 1 - distance / splashRadius);
            damage *= falloff;
        }

        return Math.floor(damage);
    }

    static checkSplashDamage(
        explosionX: number,
        explosionY: number,
        targetX: number,
        targetY: number,
        splashRadius: number,
        baseDamage: number
    ): number {
        const distance = Math.sqrt(
            Math.pow(explosionX - targetX, 2) +
            Math.pow(explosionY - targetY, 2)
        );

        if (distance > splashRadius) {
            return 0;
        }

        const falloff = 1 - distance / splashRadius;
        return Math.floor(baseDamage * falloff);
    }

    static calculateWindEffect(currentWind: number): number {
        // Wind can change slightly each turn
        const change = (Math.random() - 0.5) * 5;
        const newWind = currentWind + change;

        // Clamp wind between -20 and +20
        return Math.max(-20, Math.min(20, newWind));
    }

    static checkTankSliding(
        terrainAngle: number,
        threshold: number = 45
    ): boolean {
        return Math.abs(terrainAngle) > threshold;
    }

    static calculateTerrainAngle(
        terrain: number[],
        x: number,
        canvasHeight: number
    ): number {
        const xi = Math.floor(x);

        if (xi <= 0 || xi >= terrain.length - 1) {
            return 0;
        }

        const leftHeight = canvasHeight - terrain[xi - 1];
        const rightHeight = canvasHeight - terrain[xi + 1];
        const heightDiff = rightHeight - leftHeight;

        return Math.atan2(heightDiff, 2) * (180 / Math.PI);
    }

    static predictHit(
        trajectory: TrajectoryPoint[],
        terrain: number[],
        canvasHeight: number,
        targets: Array<{ x: number; y: number; radius: number }>
    ): { hit: boolean; point: TrajectoryPoint | null; targetIndex: number } {
        for (const point of trajectory) {
            const xi = Math.floor(point.x);

            // Check terrain collision
            if (xi >= 0 && xi < terrain.length) {
                const terrainY = canvasHeight - terrain[xi];
                if (point.y >= terrainY) {
                    return { hit: true, point, targetIndex: -1 };
                }
            }

            // Check target collision
            for (let i = 0; i < targets.length; i++) {
                const target = targets[i];
                const distance = Math.sqrt(
                    Math.pow(point.x - target.x, 2) +
                    Math.pow(point.y - target.y, 2)
                );

                if (distance <= target.radius) {
                    return { hit: true, point, targetIndex: i };
                }
            }

            // Check out of bounds
            if (point.x < 0 || point.x > terrain.length || point.y > canvasHeight) {
                return { hit: false, point: null, targetIndex: -1 };
            }
        }

        return { hit: false, point: null, targetIndex: -1 };
    }

    static simulateProjectileFlight(
        config: ProjectileConfig,
        onUpdate: (point: TrajectoryPoint) => void,
        onComplete: (finalPoint: TrajectoryPoint) => void,
        checkCollision: (x: number, y: number) => boolean
    ): void {
        const trajectory = PhysicsEngine.calculateTrajectory(config);
        let currentIndex = 0;

        const interval = setInterval(() => {
            if (currentIndex >= trajectory.length) {
                clearInterval(interval);
                onComplete(trajectory[trajectory.length - 1]);
                return;
            }

            const point = trajectory[currentIndex];
            onUpdate(point);

            // Check for collision
            if (checkCollision(point.x, point.y)) {
                clearInterval(interval);
                onComplete(point);
                return;
            }

            currentIndex++;
        }, config.dt || PhysicsEngine.DEFAULT_DT * 1000);
    }
}

// Weapon-specific physics configurations
export const WeaponPhysics = {
    standard: {
        baseDamage: 30,
        splashRadius: 30,
        explosionRadius: 35
    },
    heavy: {
        baseDamage: 50,
        splashRadius: 50,
        explosionRadius: 60,
        velocityModifier: 0.8 // Slower
    },
    cluster: {
        baseDamage: 20,
        splashRadius: 25,
        explosionRadius: 30,
        bomblets: 5,
        bombletSpread: 30
    },
    mirv: {
        baseDamage: 35,
        splashRadius: 35,
        explosionRadius: 40,
        projectiles: 3,
        splitAngle: 30
    },
    digger: {
        baseDamage: 40,
        splashRadius: 40,
        explosionRadius: 45,
        digDepth: 3 // Burrows through terrain
    }
};
