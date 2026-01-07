// Lava manager for napalm weapon effects

export interface LavaPool {
    id: string;
    x: number;          // Current X position
    y: number;          // Current Y position (terrain surface)
    radius: number;     // Effective damage radius
    intensity: number;  // 0-1, affects damage and visuals
}

export class LavaManager {
    private pools: Map<string, LavaPool> = new Map();
    private tickInterval: Timer | null = null;
    private flowInterval: Timer | null = null;
    private terrain: number[] | null = null;
    private canvasHeight: number = 600;

    createInitialPools(x: number, y: number, count: number = 6): LavaPool[] {
        const pools: LavaPool[] = [];

        // Create pools in circular pattern around impact
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + (Math.random() * 0.3 - 0.15);
            const distance = 10 + Math.random() * 20;
            const poolX = x + Math.cos(angle) * distance;
            const poolY = y + Math.sin(angle) * distance;

            const pool: LavaPool = {
                id: crypto.randomUUID(),
                x: poolX,
                y: poolY,
                radius: 15,
                intensity: 0.8 + Math.random() * 0.2
            };

            this.pools.set(pool.id, pool);
            pools.push(pool);
        }

        return pools;
    }

    setTerrain(terrain: number[], canvasHeight: number): void {
        this.terrain = terrain;
        this.canvasHeight = canvasHeight;
    }

    flowDownhill(): void {
        if (!this.terrain) return;

        const poolsArray = Array.from(this.pools.values());

        for (const pool of poolsArray) {
            const xi = Math.floor(pool.x);

            // Bounds check
            if (xi < 1 || xi >= this.terrain.length - 1) {
                this.pools.delete(pool.id);
                continue;
            }

            // Get terrain heights around pool
            const centerHeight = this.terrain[xi];
            const leftHeight = this.terrain[xi - 1];
            const rightHeight = this.terrain[xi + 1];

            // Calculate slopes
            const leftSlope = centerHeight - leftHeight;
            const rightSlope = centerHeight - rightHeight;

            // Determine flow direction
            let flowX = 0;

            if (leftSlope > 2 && leftSlope > rightSlope) {
                // Flow left (downhill)
                flowX = -2;
            } else if (rightSlope > 2 && rightSlope > leftSlope) {
                // Flow right (downhill)
                flowX = 2;
            } else if (Math.abs(leftSlope) < 1 && Math.abs(rightSlope) < 1) {
                // Pooling in valley - increase intensity
                pool.intensity = Math.min(1, pool.intensity * 1.05);

                // Try to merge with nearby pools
                this.mergeNearbyPools(pool);
                continue;
            }

            // Move pool if flowing
            if (flowX !== 0) {
                const newX = pool.x + flowX;
                const newXi = Math.floor(newX);

                // Bounds check
                if (newXi >= 0 && newXi < this.terrain.length) {
                    pool.x = newX;
                    pool.y = this.canvasHeight - this.terrain[newXi];

                    // Decrease intensity slightly when flowing
                    pool.intensity = Math.max(0.3, pool.intensity * 0.98);
                }
            }
        }

        // Remove pools with very low intensity
        for (const [id, pool] of this.pools) {
            if (pool.intensity < 0.3) {
                this.pools.delete(id);
            }
        }
    }

    private mergeNearbyPools(pool: LavaPool): void {
        const nearbyPools: string[] = [];

        for (const [id, otherPool] of this.pools) {
            if (id === pool.id) continue;

            const distance = Math.sqrt(
                Math.pow(pool.x - otherPool.x, 2) +
                Math.pow(pool.y - otherPool.y, 2)
            );

            if (distance < pool.radius) {
                nearbyPools.push(id);
            }
        }

        // Merge nearby pools into this one
        if (nearbyPools.length > 0) {
            for (const id of nearbyPools) {
                const mergedPool = this.pools.get(id);
                if (mergedPool) {
                    // Increase intensity from merged pool
                    pool.intensity = Math.min(1, pool.intensity + mergedPool.intensity * 0.3);
                    this.pools.delete(id);
                }
            }
        }
    }

    checkPlayerInLava(playerX: number, playerY: number): LavaPool | null {
        for (const pool of this.pools.values()) {
            const distance = Math.sqrt(
                Math.pow(playerX - pool.x, 2) +
                Math.pow(playerY - pool.y, 2)
            );

            if (distance <= pool.radius) {
                return pool;
            }
        }
        return null;
    }

    startDamageTick(callback: (playerId: string, damage: number) => void, game: any): void {
        this.tickInterval = setInterval(() => {
            for (const player of game.players) {
                if (player.hp <= 0) continue;

                const lavaPool = this.checkPlayerInLava(player.position.x, player.position.y);
                if (lavaPool) {
                    // Damage based on pool intensity
                    const damage = Math.floor(5 * lavaPool.intensity);
                    callback(player.id, damage);
                }
            }
        }, 1000); // Tick every second
    }

    startFlowSimulation(): void {
        this.flowInterval = setInterval(() => {
            this.flowDownhill();
        }, 500); // Flow every 0.5 seconds
    }

    stopDamageTick(): void {
        if (this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
        }
    }

    stopFlowSimulation(): void {
        if (this.flowInterval) {
            clearInterval(this.flowInterval);
            this.flowInterval = null;
        }
    }

    clearAll(): void {
        this.pools.clear();
        this.stopDamageTick();
        this.stopFlowSimulation();
    }

    getActivePools(): LavaPool[] {
        return Array.from(this.pools.values());
    }
}
