// Terrain generation and collision detection

// Simple Perlin noise implementation
class PerlinNoise {
    private permutation: number[];

    constructor(seed?: number) {
        // Generate permutation table
        const p: number[] = [];
        for (let i = 0; i < 256; i++) {
            p[i] = i;
        }

        // Shuffle using seed
        if (seed !== undefined) {
            this.shuffle(p, seed);
        } else {
            this.shuffle(p, Math.random() * 1000);
        }

        // Duplicate permutation table
        this.permutation = [...p, ...p];
    }

    private shuffle(array: number[], seed: number): void {
        let currentIndex = array.length;
        let randomValue: number;

        // Seeded random function
        const random = () => {
            const x = Math.sin(seed++) * 10000;
            return x - Math.floor(x);
        };

        while (currentIndex !== 0) {
            randomValue = Math.floor(random() * currentIndex);
            currentIndex--;

            [array[currentIndex], array[randomValue]] =
            [array[randomValue], array[currentIndex]];
        }
    }

    private fade(t: number): number {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    private lerp(a: number, b: number, t: number): number {
        return a + t * (b - a);
    }

    private grad(hash: number, x: number): number {
        return (hash & 1) === 0 ? x : -x;
    }

    noise(x: number): number {
        const X = Math.floor(x) & 255;
        x -= Math.floor(x);

        const u = this.fade(x);

        const a = this.permutation[X];
        const b = this.permutation[X + 1];

        return this.lerp(
            this.grad(this.permutation[a], x),
            this.grad(this.permutation[b], x - 1),
            u
        );
    }
}

export interface TerrainOptions {
    width: number;
    height: number;
    seed?: number;
    octaves?: number;
    persistence?: number;
    minHeight?: number;
    maxHeight?: number;
}

export class TerrainGenerator {
    private perlin: PerlinNoise;
    private width: number;
    private height: number;
    private octaves: number;
    private persistence: number;
    private minHeight: number;
    private maxHeight: number;

    constructor(options: TerrainOptions) {
        this.width = options.width;
        this.height = options.height;
        this.octaves = options.octaves || 4;
        this.persistence = options.persistence || 0.5;
        this.minHeight = options.minHeight || 0.2;
        this.maxHeight = options.maxHeight || 0.8;
        this.perlin = new PerlinNoise(options.seed);
    }

    generate(): number[] {
        const terrain: number[] = [];

        for (let x = 0; x < this.width; x++) {
            let amplitude = 1;
            let frequency = 0.005;
            let noiseHeight = 0;

            // Octave-based noise
            for (let octave = 0; octave < this.octaves; octave++) {
                const sampleX = x * frequency;
                const perlinValue = this.perlin.noise(sampleX);
                noiseHeight += perlinValue * amplitude;

                amplitude *= this.persistence;
                frequency *= 2;
            }

            // Normalize to height range (20-80% of canvas height)
            const normalizedHeight = (noiseHeight + 1) / 2;
            const terrainHeight =
                normalizedHeight * (this.maxHeight - this.minHeight) + this.minHeight;
            const finalHeight = Math.floor(terrainHeight * this.height);

            terrain.push(finalHeight);
        }

        return terrain;
    }

    static smoothTerrain(terrain: number[], smoothingFactor: number = 3): number[] {
        const smoothed: number[] = [];

        for (let i = 0; i < terrain.length; i++) {
            let sum = 0;
            let count = 0;

            for (let j = -smoothingFactor; j <= smoothingFactor; j++) {
                const index = i + j;
                if (index >= 0 && index < terrain.length) {
                    sum += terrain[index];
                    count++;
                }
            }

            smoothed.push(Math.floor(sum / count));
        }

        return smoothed;
    }

    static findSafeSpawnPositions(
        terrain: number[],
        numPlayers: number,
        canvasHeight: number,
        minDistance: number = 300
    ): Array<{ x: number; y: number }> {
        const positions: Array<{ x: number; y: number }> = [];
        const margin = 100;
        const availableWidth = terrain.length - margin * 2;

        // Divide terrain into zones for each player
        const zoneWidth = availableWidth / numPlayers;
        const tankHeight = 20; // Tank body is 15px + turret 5px = 20px total height

        for (let i = 0; i < numPlayers; i++) {
            const zoneStart = margin + Math.floor(zoneWidth * i);
            const zoneEnd = margin + Math.floor(zoneWidth * (i + 1));
            const zoneMid = Math.floor((zoneStart + zoneEnd) / 2);

            // Find flattest area in zone
            let bestX = zoneMid;
            let minSlope = Infinity;

            for (let x = zoneStart + 50; x < zoneEnd - 50; x++) {
                const leftHeight = terrain[x - 10];
                const rightHeight = terrain[x + 10];
                const slope = Math.abs(rightHeight - leftHeight);

                if (slope < minSlope) {
                    minSlope = slope;
                    bestX = x;
                }
            }

            // Calculate Y position: terrain surface minus tank body offset
            // Tank is drawn with body from (y-10) to (y+5), so y should be at terrainY - 5
            const terrainSurfaceY = canvasHeight - terrain[bestX];
            const y = terrainSurfaceY - 5;
            positions.push({ x: bestX, y });
        }

        return positions;
    }
}

export class TerrainCollision {
    private terrain: number[];
    private canvasHeight: number;

    constructor(terrain: number[], canvasHeight: number) {
        this.terrain = terrain;
        this.canvasHeight = canvasHeight;
    }

    checkCollision(x: number, y: number): boolean {
        const xi = Math.floor(x);

        if (xi < 0 || xi >= this.terrain.length) {
            return true; // Out of bounds
        }

        const terrainY = this.canvasHeight - this.terrain[xi];
        return y >= terrainY;
    }

    getTerrainHeight(x: number): number {
        const xi = Math.floor(x);

        if (xi < 0 || xi >= this.terrain.length) {
            return 0;
        }

        return this.terrain[xi];
    }

    destroyTerrain(x: number, y: number, radius: number): void {
        const xi = Math.floor(x);
        const yi = Math.floor(y);

        for (let dx = -radius; dx <= radius; dx++) {
            const px = xi + dx;
            if (px < 0 || px >= this.terrain.length) continue;

            for (let dy = -radius; dy <= radius; dy++) {
                const py = yi + dy;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance <= radius) {
                    const terrainY = this.canvasHeight - this.terrain[px];
                    const destroyY = Math.min(py, terrainY);

                    if (destroyY >= 0) {
                        const newHeight = Math.max(0, this.canvasHeight - destroyY - radius);
                        this.terrain[px] = Math.min(this.terrain[px], newHeight);
                    }
                }
            }
        }
    }

    getTerrain(): number[] {
        return this.terrain;
    }
}
