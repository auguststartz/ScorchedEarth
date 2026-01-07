// Core game engine

import type { ServerWebSocket } from 'bun';
import { logger } from '../utils/logger';
import type { GameState, Player } from './state';
import { GameStateManager } from './state';
import { TerrainGenerator, TerrainCollision } from './terrain';
import { PhysicsEngine, type ProjectileConfig, type TrajectoryPoint, WeaponPhysics } from './physics';
import { WEAPONS, WeaponInventory, WeaponEffects, type WeaponType } from './weapons';
import { MessageType } from '../websocket/messages';
import { AIManager } from '../ai/manager';

export interface GameConfig {
    canvasWidth: number;
    canvasHeight: number;
    turnDuration: number;
    maxTurns: number;
}

export class GameEngine {
    private gameManager: GameStateManager;
    private aiManager: AIManager;
    private config: GameConfig;

    constructor(config?: Partial<GameConfig>) {
        this.gameManager = new GameStateManager();
        this.aiManager = new AIManager();
        this.config = {
            canvasWidth: config?.canvasWidth || 1200,
            canvasHeight: config?.canvasHeight || 600,
            turnDuration: config?.turnDuration || 45000, // 45 seconds
            maxTurns: config?.maxTurns || 50
        };
    }

    createGame(
        gameId: string,
        players: Array<{
            id: string;
            name: string;
            type: 'human' | 'ai';
            socket: ServerWebSocket<any> | null;
            aiDifficulty?: 'easy' | 'medium' | 'hard';
        }>
    ): GameState {
        logger.info('Creating new game', { gameId, playerCount: players.length });

        // Generate terrain
        const terrainGen = new TerrainGenerator({
            width: this.config.canvasWidth,
            height: this.config.canvasHeight,
            seed: Math.random() * 10000,
            octaves: 4,
            persistence: 0.5,
            minHeight: 0.2,
            maxHeight: 0.6
        });

        const terrain = terrainGen.generate();

        // Find spawn positions
        const spawnPositions = TerrainGenerator.findSafeSpawnPositions(
            terrain,
            players.length,
            this.config.canvasHeight,
            300
        );

        // Create player objects
        const gamePlayers: Player[] = players.map((p, index) => ({
            id: p.id,
            name: p.name,
            type: p.type,
            socket: p.socket,
            position: {
                x: spawnPositions[index].x,
                y: spawnPositions[index].y
            },
            hp: 100,
            weapons: {
                standard: WEAPONS.standard.startingAmmo, // -1 for unlimited
                heavy: WEAPONS.heavy.startingAmmo,
                cluster: WEAPONS.cluster.startingAmmo,
                mirv: WEAPONS.mirv.startingAmmo,
                digger: WEAPONS.digger.startingAmmo
            },
            stats: {
                shotsTotal: 0,
                shotsHit: 0,
                damageDealt: 0
            }
        }));

        // Generate initial wind
        const wind = (Math.random() - 0.5) * 20;

        // Create game state
        const game = this.gameManager.createGame(gameId, gamePlayers, terrain, wind);

        // Register AI players
        for (let i = 0; i < gamePlayers.length; i++) {
            const player = gamePlayers[i];
            if (player.type === 'ai') {
                const difficulty = players[i].aiDifficulty || 'medium';
                this.aiManager.registerAI(player.id, difficulty);
                logger.info('Registered AI player', { playerId: player.id, difficulty });
            }
        }

        logger.info('Game created', {
            gameId,
            players: gamePlayers.map(p => ({ id: p.id, name: p.name })),
            terrainLength: terrain.length,
            wind
        });

        // Check if first player is AI
        this.checkAndExecuteAITurn(game);

        return game;
    }

    getGame(gameId: string): GameState | null {
        return this.gameManager.getGame(gameId);
    }

    processPlayerAction(
        gameId: string,
        playerId: string,
        angle: number,
        power: number,
        weaponType: WeaponType
    ): void {
        const game = this.gameManager.getGame(gameId);
        if (!game) {
            logger.error('Game not found', { gameId });
            return;
        }

        const currentPlayer = this.gameManager.getCurrentPlayer(game);
        if (currentPlayer.id !== playerId) {
            logger.warn('Not player turn', { gameId, playerId, currentPlayerId: currentPlayer.id });
            return;
        }

        // Check if player has ammo (-1 means unlimited)
        if (currentPlayer.weapons[weaponType] !== -1 && currentPlayer.weapons[weaponType] <= 0) {
            logger.warn('No ammo for weapon', { gameId, playerId, weaponType });
            return;
        }

        // Deduct ammo (don't decrement unlimited ammo)
        if (currentPlayer.weapons[weaponType] !== -1) {
            currentPlayer.weapons[weaponType]--;
        }
        currentPlayer.stats.shotsTotal++;

        logger.info('Player action', { gameId, playerId, angle, power, weaponType });

        // Calculate trajectory with weapon-specific modifications
        let adjustedPower = power;

        // Heavy weapon is slower
        if (weaponType === 'heavy') {
            const weaponPhysics = WeaponPhysics[weaponType];
            adjustedPower = power * (weaponPhysics.velocityModifier || 1);
        }

        const config: ProjectileConfig = {
            startX: currentPlayer.position.x,
            startY: currentPlayer.position.y,
            angle,
            power: adjustedPower,
            wind: game.wind
        };

        const trajectory = PhysicsEngine.calculateTrajectory(config);

        // Simulate projectile and find impact point
        const terrainCollision = new TerrainCollision(game.terrain, this.config.canvasHeight);
        let impactPoint: TrajectoryPoint | null = null;

        logger.info('Simulating projectile flight', {
            trajectoryLength: trajectory.length,
            startPos: { x: trajectory[0]?.x, y: trajectory[0]?.y },
            endPos: { x: trajectory[trajectory.length - 1]?.x, y: trajectory[trajectory.length - 1]?.y }
        });

        // Skip first few frames to let projectile clear the shooting tank
        const graceFrames = 5; // Skip collision detection for first 5 trajectory points

        // Digger weapon penetrates terrain before exploding
        let terrainHitCount = 0;
        const diggerPenetrationDepth = weaponType === 'digger' ? 3 : 0; // Number of terrain hits before exploding

        for (let i = 0; i < trajectory.length; i++) {
            const point = trajectory[i];

            // Check player/tank collision (tanks are about 30x20 pixels)
            for (const player of game.players) {
                if (player.hp <= 0) continue; // Skip dead players
                if (player.id === currentPlayer.id) continue; // Skip shooter (can't hit yourself)

                const tankWidth = 30;
                const tankHeight = 20;
                const distance = Math.sqrt(
                    Math.pow(point.x - player.position.x, 2) +
                    Math.pow(point.y - player.position.y, 2)
                );

                // Check if projectile is within tank hitbox
                if (distance <= tankWidth / 2) {
                    impactPoint = point;
                    logger.info('Tank collision detected', {
                        x: point.x.toFixed(1),
                        y: point.y.toFixed(1),
                        tankId: player.id,
                        tankName: player.name
                    });
                    break;
                }
            }

            if (impactPoint) break; // Found a tank hit, stop checking

            // Skip terrain collision for grace period to let projectile clear shooting tank
            if (i < graceFrames) continue;

            // Check terrain collision
            if (terrainCollision.checkCollision(point.x, point.y)) {
                terrainHitCount++;

                // Digger penetrates through terrain for a few hits
                if (weaponType === 'digger' && terrainHitCount <= diggerPenetrationDepth) {
                    logger.info('Digger penetrating terrain', {
                        hitCount: terrainHitCount,
                        maxDepth: diggerPenetrationDepth
                    });
                    continue; // Keep going, don't stop yet
                }

                impactPoint = point;
                logger.info('Terrain collision detected', { x: point.x.toFixed(1), y: point.y.toFixed(1) });
                break;
            }

            // Check out of bounds
            if (point.x < 0 || point.x > this.config.canvasWidth ||
                point.y > this.config.canvasHeight) {
                impactPoint = point;
                logger.info('Out of bounds collision', { x: point.x.toFixed(1), y: point.y.toFixed(1) });
                break;
            }
        }

        if (!impactPoint) {
            impactPoint = trajectory[trajectory.length - 1];
            logger.warn('No collision found, using last trajectory point');
        }

        // Broadcast projectile animation to all players
        this.broadcastProjectileAnimation(game, trajectory, impactPoint, weaponType);

        // Calculate damage and update game state after animation
        // Use impact index instead of full trajectory length for timing
        const impactIndex = trajectory.findIndex(p => p === impactPoint);
        const animationDuration = (impactIndex !== -1 ? impactIndex : trajectory.length - 1) * 16;
        setTimeout(() => {
            this.processImpact(game, impactPoint!, weaponType, currentPlayer.id);
        }, animationDuration); // Simulate flight time based on actual impact
    }

    private processImpact(
        game: GameState,
        impactPoint: TrajectoryPoint,
        weaponType: WeaponType,
        attackerId: string
    ): void {
        const weapon = WEAPONS[weaponType];
        const terrainCollision = new TerrainCollision(game.terrain, this.config.canvasHeight);

        // Apply weapon effects and collect secondary explosions
        let secondaryExplosions: Array<{ x: number; y: number; radius: number }> = [];

        switch (weaponType) {
            case 'standard':
                WeaponEffects.applyStandardEffect(
                    impactPoint.x,
                    impactPoint.y,
                    game.terrain,
                    this.config.canvasHeight
                );
                break;
            case 'heavy':
                WeaponEffects.applyHeavyEffect(
                    impactPoint.x,
                    impactPoint.y,
                    game.terrain,
                    this.config.canvasHeight
                );
                break;
            case 'cluster':
                secondaryExplosions = WeaponEffects.applyClusterEffect(
                    impactPoint.x,
                    impactPoint.y,
                    game.terrain,
                    this.config.canvasHeight
                );
                break;
            case 'mirv':
                secondaryExplosions = WeaponEffects.applyMIRVEffect(
                    impactPoint.x,
                    impactPoint.y,
                    game.terrain,
                    this.config.canvasHeight
                );
                break;
            case 'digger':
                WeaponEffects.applyDiggerEffect(
                    impactPoint.x,
                    impactPoint.y,
                    game.terrain,
                    this.config.canvasHeight
                );
                break;
        }

        // Calculate damage to all players
        const damageDealt: Array<{ playerId: string; damageAmount: number; newHp: number }> = [];

        for (const player of game.players) {
            if (player.hp <= 0) continue;

            const distance = Math.sqrt(
                Math.pow(impactPoint.x - player.position.x, 2) +
                Math.pow(impactPoint.y - player.position.y, 2)
            );

            if (distance <= weapon.splashRadius) {
                const damage = PhysicsEngine.checkSplashDamage(
                    impactPoint.x,
                    impactPoint.y,
                    player.position.x,
                    player.position.y,
                    weapon.splashRadius,
                    weapon.damage
                );

                if (damage > 0) {
                    player.hp = Math.max(0, player.hp - damage);
                    damageDealt.push({
                        playerId: player.id,
                        damageAmount: damage,
                        newHp: player.hp
                    });

                    // Update attacker's stats
                    const attacker = game.players.find(p => p.id === attackerId);
                    if (attacker) {
                        attacker.stats.damageDealt += damage;
                        if (player.id !== attackerId) {
                            attacker.stats.shotsHit++;
                        }
                    }
                }
            }
        }

        // Broadcast explosion event
        this.broadcast(game, {
            type: MessageType.EXPLOSION_EVENT,
            timestamp: Date.now(),
            payload: {
                x: impactPoint.x,
                y: impactPoint.y,
                radius: weapon.explosionRadius,
                damage: damageDealt
            }
        });

        // Broadcast secondary explosions for cluster and MIRV weapons
        if (secondaryExplosions.length > 0) {
            // Stagger secondary explosions for visual effect
            secondaryExplosions.forEach((explosion, index) => {
                setTimeout(() => {
                    this.broadcast(game, {
                        type: MessageType.EXPLOSION_EVENT,
                        timestamp: Date.now(),
                        payload: {
                            x: explosion.x,
                            y: explosion.y,
                            radius: explosion.radius,
                            damage: [] // Damage already calculated in main explosion
                        }
                    });
                }, 100 + index * 50); // Stagger by 50ms each
            });
        }

        // Update terrain in game state
        game.terrain = terrainCollision.getTerrain();

        // Apply gravity to tanks (make them fall if terrain beneath is destroyed)
        this.applyTankGravity(game);

        // Change wind slightly
        game.wind = PhysicsEngine.calculateWindEffect(game.wind);

        logger.info('Post-impact game state', {
            gameId: game.id,
            players: game.players.map(p => ({
                id: p.id,
                name: p.name,
                hp: p.hp,
                position: { x: p.position.x.toFixed(1), y: p.position.y.toFixed(1) }
            }))
        });

        // Check for game over
        if (this.gameManager.checkGameOver(game)) {
            this.endGame(game);
        } else {
            // Next turn
            this.gameManager.nextTurn(game);
            this.broadcast(game, {
                type: MessageType.TURN_END,
                timestamp: Date.now(),
                payload: {
                    nextTurn: this.gameManager.getCurrentPlayer(game).id,
                    turnNumber: game.turnNumber
                }
            });

            // Broadcast updated game state
            this.broadcastGameState(game);

            // Check if next player is AI
            this.checkAndExecuteAITurn(game);
        }
    }

    private broadcastProjectileAnimation(
        game: GameState,
        trajectory: TrajectoryPoint[],
        impactPoint: TrajectoryPoint,
        weaponType: WeaponType
    ): void {
        // Send trajectory points to all players for animation
        // Only send points up to and including the impact point
        let index = 0;
        const impactIndex = trajectory.findIndex(p => p === impactPoint);
        const maxIndex = impactIndex !== -1 ? impactIndex : trajectory.length - 1;

        const interval = setInterval(() => {
            if (index > maxIndex) {
                clearInterval(interval);
                return;
            }

            const point = trajectory[index];
            this.broadcast(game, {
                type: MessageType.PROJECTILE_UPDATE,
                timestamp: Date.now(),
                payload: {
                    x: point.x,
                    y: point.y,
                    velocityX: point.vx,
                    velocityY: point.vy
                }
            });

            index++;
        }, 16); // 60 FPS
    }

    private applyTankGravity(game: GameState): void {
        for (const player of game.players) {
            if (player.hp <= 0) continue; // Skip dead players

            const tankX = Math.floor(player.position.x);
            const tankY = player.position.y;

            // Calculate terrain surface Y coordinate
            const terrainSurfaceY = this.config.canvasHeight - game.terrain[tankX];

            // Tank is drawn with body from (y-10) to (y+5)
            // Tank bottom should be at terrainSurfaceY, so position.y should be terrainSurfaceY - 5
            const correctTankY = terrainSurfaceY - 5;

            // Check if tank is floating or sunk (allow 2px tolerance)
            const yDiff = Math.abs(tankY - correctTankY);
            if (yDiff > 2) {
                const oldY = tankY;

                // Move tank to correct position on terrain surface
                player.position.y = correctTankY;

                // Apply fall damage if tank fell (moved down significantly)
                if (correctTankY > oldY) {
                    const fallDistance = correctTankY - oldY;
                    if (fallDistance > 50) {
                        const fallDamage = Math.floor(fallDistance / 10);
                        player.hp = Math.max(0, player.hp - fallDamage);
                        logger.info('Tank took fall damage', {
                            playerId: player.id,
                            playerName: player.name,
                            fallDistance: fallDistance.toFixed(0),
                            fallDamage,
                            newHp: player.hp
                        });
                    }
                }

                logger.info('Tank position corrected', {
                    playerId: player.id,
                    playerName: player.name,
                    oldY: oldY.toFixed(0),
                    newY: correctTankY.toFixed(0),
                    terrainSurfaceY: terrainSurfaceY.toFixed(0)
                });
            }
        }
    }

    private endGame(game: GameState): void {
        const winner = game.players.find(p => p.id === game.winner);

        logger.info('Game ended', {
            gameId: game.id,
            winner: winner?.name,
            turns: game.turnNumber
        });

        this.broadcast(game, {
            type: MessageType.GAME_OVER,
            timestamp: Date.now(),
            payload: {
                winner: {
                    id: winner?.id || '',
                    name: winner?.name || 'Draw'
                },
                statistics: {
                    totalTurns: game.turnNumber,
                    players: game.players.map(p => ({
                        id: p.id,
                        name: p.name,
                        damageDealt: p.stats.damageDealt,
                        accuracy: p.stats.shotsTotal > 0
                            ? p.stats.shotsHit / p.stats.shotsTotal
                            : 0,
                        shotsTotal: p.stats.shotsTotal,
                        shotsHit: p.stats.shotsHit
                    }))
                }
            }
        });

        // Clean up game after a delay
        setTimeout(() => {
            this.gameManager.deleteGame(game.id);
        }, 60000); // 1 minute
    }

    private broadcastGameState(game: GameState): void {
        this.broadcast(game, {
            type: MessageType.GAME_STATE,
            timestamp: Date.now(),
            payload: {
                gameId: game.id,
                players: game.players.map(p => ({
                    id: p.id,
                    name: p.name,
                    hp: p.hp,
                    position: p.position,
                    weapons: p.weapons
                })),
                terrain: game.terrain,
                wind: game.wind,
                currentTurn: this.gameManager.getCurrentPlayer(game).id,
                turnTimeRemaining: this.config.turnDuration / 1000
            }
        });
    }

    private broadcast(game: GameState, message: any): void {
        for (const player of game.players) {
            if (player.socket) {
                try {
                    player.socket.send(JSON.stringify(message));
                } catch (error) {
                    logger.error('Failed to send message to player', {
                        playerId: player.id,
                        error
                    });
                }
            }
        }
    }

    private checkAndExecuteAITurn(game: GameState): void {
        const currentPlayer = this.gameManager.getCurrentPlayer(game);

        if (currentPlayer.type === 'ai') {
            logger.info('AI turn detected', { gameId: game.id, playerId: currentPlayer.id });

            // Execute AI turn after a delay
            this.aiManager.executeAITurn(
                game,
                currentPlayer.id,
                (playerId, angle, power, weapon) => {
                    this.processPlayerAction(game.id, playerId, angle, power, weapon as WeaponType);
                }
            ).catch((error) => {
                logger.error('AI turn execution failed', { error });
            });
        }
    }

    getGameManager(): GameStateManager {
        return this.gameManager;
    }
}
