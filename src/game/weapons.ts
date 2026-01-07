// Weapons system

export type WeaponType = 'standard' | 'heavy' | 'cluster' | 'mirv' | 'digger' | 'napalm';

export interface Weapon {
    type: WeaponType;
    name: string;
    description: string;
    damage: number;
    splashRadius: number;
    explosionRadius: number;
    startingAmmo: number;
    specialEffect?: string;
}

export const WEAPONS: Record<WeaponType, Weapon> = {
    standard: {
        type: 'standard',
        name: 'Standard Shell',
        description: 'Basic projectile with moderate damage',
        damage: 30,
        splashRadius: 30,
        explosionRadius: 35,
        startingAmmo: -1 // Unlimited ammo
    },
    heavy: {
        type: 'heavy',
        name: 'Heavy Missile',
        description: 'High damage, slower projectile',
        damage: 50,
        splashRadius: 50,
        explosionRadius: 60,
        startingAmmo: 3,
        specialEffect: 'slower'
    },
    cluster: {
        type: 'cluster',
        name: 'Cluster Bomb',
        description: 'Splits into 5 bomblets for wide area damage',
        damage: 20,
        splashRadius: 25,
        explosionRadius: 30,
        startingAmmo: 3,
        specialEffect: 'cluster'
    },
    mirv: {
        type: 'mirv',
        name: 'MIRV',
        description: 'Multiple Independent Re-entry Vehicles',
        damage: 35,
        splashRadius: 35,
        explosionRadius: 40,
        startingAmmo: 3,
        specialEffect: 'mirv'
    },
    digger: {
        type: 'digger',
        name: 'Digger',
        description: 'Burrows through terrain before exploding',
        damage: 40,
        splashRadius: 40,
        explosionRadius: 45,
        startingAmmo: 3,
        specialEffect: 'digger'
    },
    napalm: {
        type: 'napalm',
        name: 'Napalm',
        description: 'Creates flowing lava that burns tanks',
        damage: 15,
        splashRadius: 40,
        explosionRadius: 35,
        startingAmmo: 2,
        specialEffect: 'napalm'
    }
};

export class WeaponInventory {
    private ammo: Record<WeaponType, number>;

    constructor() {
        this.ammo = {
            standard: WEAPONS.standard.startingAmmo,
            heavy: WEAPONS.heavy.startingAmmo,
            cluster: WEAPONS.cluster.startingAmmo,
            mirv: WEAPONS.mirv.startingAmmo,
            digger: WEAPONS.digger.startingAmmo,
            napalm: WEAPONS.napalm.startingAmmo
        };
    }

    hasAmmo(weaponType: WeaponType): boolean {
        return this.ammo[weaponType] === -1 || this.ammo[weaponType] > 0;
    }

    getAmmo(weaponType: WeaponType): number {
        return this.ammo[weaponType];
    }

    useWeapon(weaponType: WeaponType): boolean {
        if (!this.hasAmmo(weaponType)) {
            return false;
        }

        // Don't decrement unlimited ammo (-1)
        if (this.ammo[weaponType] !== -1) {
            this.ammo[weaponType]--;
        }
        return true;
    }

    getInventory(): Record<WeaponType, number> {
        return { ...this.ammo };
    }

    reset(): void {
        this.ammo = {
            standard: WEAPONS.standard.startingAmmo,
            heavy: WEAPONS.heavy.startingAmmo,
            cluster: WEAPONS.cluster.startingAmmo,
            mirv: WEAPONS.mirv.startingAmmo,
            digger: WEAPONS.digger.startingAmmo,
            napalm: WEAPONS.napalm.startingAmmo
        };
    }
}

export class WeaponEffects {
    static applyStandardEffect(
        explosionX: number,
        explosionY: number,
        terrain: number[],
        canvasHeight: number
    ): void {
        const weapon = WEAPONS.standard;
        this.createCrater(explosionX, explosionY, weapon.explosionRadius, terrain, canvasHeight);
    }

    static applyHeavyEffect(
        explosionX: number,
        explosionY: number,
        terrain: number[],
        canvasHeight: number
    ): void {
        const weapon = WEAPONS.heavy;
        this.createCrater(explosionX, explosionY, weapon.explosionRadius, terrain, canvasHeight);
    }

    static applyClusterEffect(
        explosionX: number,
        explosionY: number,
        terrain: number[],
        canvasHeight: number
    ): Array<{ x: number; y: number; radius: number }> {
        const weapon = WEAPONS.cluster;
        const bomblets: Array<{ x: number; y: number; radius: number }> = [];

        // Create main explosion
        this.createCrater(explosionX, explosionY, weapon.explosionRadius * 0.5, terrain, canvasHeight);

        // Generate bomblet positions
        for (let i = 0; i < 5; i++) {
            const angle = (Math.PI * 2 * i) / 5 + Math.random() * 0.5;
            const distance = 20 + Math.random() * 30;
            const bx = explosionX + Math.cos(angle) * distance;
            const by = explosionY + Math.sin(angle) * distance;

            bomblets.push({
                x: bx,
                y: by,
                radius: weapon.explosionRadius
            });

            this.createCrater(bx, by, weapon.explosionRadius, terrain, canvasHeight);
        }

        return bomblets;
    }

    static applyMIRVEffect(
        explosionX: number,
        explosionY: number,
        terrain: number[],
        canvasHeight: number
    ): Array<{ x: number; y: number; radius: number }> {
        const weapon = WEAPONS.mirv;
        const impacts: Array<{ x: number; y: number; radius: number }> = [];

        // Create 3 separate impact points
        const spacing = 40;
        for (let i = -1; i <= 1; i++) {
            const x = explosionX + i * spacing;
            const y = explosionY + Math.random() * 20;

            impacts.push({
                x,
                y,
                radius: weapon.explosionRadius
            });

            this.createCrater(x, y, weapon.explosionRadius, terrain, canvasHeight);
        }

        return impacts;
    }

    static applyDiggerEffect(
        explosionX: number,
        explosionY: number,
        terrain: number[],
        canvasHeight: number
    ): void {
        const weapon = WEAPONS.digger;

        // Create deeper, more focused crater
        const xi = Math.floor(explosionX);
        const yi = Math.floor(explosionY);
        const radius = weapon.explosionRadius;

        for (let dx = -radius; dx <= radius; dx++) {
            const px = xi + dx;
            if (px < 0 || px >= terrain.length) continue;

            const distanceFromCenter = Math.abs(dx);
            const depthMultiplier = 1.5 - (distanceFromCenter / radius);

            for (let dy = -radius * 2; dy <= radius; dy++) {
                const py = yi + dy;
                const distance = Math.sqrt(dx * dx + (dy * dy) / 4);

                if (distance <= radius) {
                    const terrainY = canvasHeight - terrain[px];
                    const destroyY = Math.min(py, terrainY);

                    if (destroyY >= 0) {
                        const depth = radius * depthMultiplier;
                        const newHeight = Math.max(0, canvasHeight - destroyY - depth);
                        terrain[px] = Math.min(terrain[px], newHeight);
                    }
                }
            }
        }
    }

    static applyNapalmEffect(
        explosionX: number,
        explosionY: number,
        terrain: number[],
        canvasHeight: number
    ): void {
        const weapon = WEAPONS.napalm;

        // Create small crater (half size of normal explosion)
        this.createCrater(explosionX, explosionY, weapon.explosionRadius * 0.5, terrain, canvasHeight);
    }

    private static createCrater(
        x: number,
        y: number,
        radius: number,
        terrain: number[],
        canvasHeight: number
    ): void {
        const xi = Math.floor(x);
        const yi = Math.floor(y);

        for (let dx = -radius; dx <= radius; dx++) {
            const px = xi + dx;
            if (px < 0 || px >= terrain.length) continue;

            for (let dy = -radius; dy <= radius; dy++) {
                const py = yi + dy;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance <= radius) {
                    const terrainY = canvasHeight - terrain[px];
                    const destroyY = Math.min(py, terrainY);

                    if (destroyY >= 0) {
                        const newHeight = Math.max(0, canvasHeight - destroyY - radius);
                        terrain[px] = Math.min(terrain[px], newHeight);
                    }
                }
            }
        }
    }
}
