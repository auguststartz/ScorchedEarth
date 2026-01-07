// Canvas renderer for game graphics

class GameRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.terrain = [];
        this.players = [];
        this.projectile = null;
        this.explosions = [];
        this.lavaPools = [];
        this.lavaAnimationFrame = 0;
        this.animationFrame = null;
        this.aimAngle = 45; // Current aim angle in degrees
        this.localPlayerId = null; // ID of the local player
    }

    clear() {
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    drawBackground() {
        // Gradient sky
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#16213e');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Stars
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * this.width;
            const y = Math.random() * this.height * 0.4;
            const size = Math.random() * 2;
            this.ctx.fillRect(x, y, size, size);
        }
    }

    setTerrain(terrainData) {
        this.terrain = terrainData;
    }

    drawTerrain() {
        if (!this.terrain || this.terrain.length === 0) {
            // Draw placeholder terrain
            this.ctx.fillStyle = '#2d4a2e';
            this.ctx.strokeStyle = '#4a7c4e';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(0, this.height);

            for (let x = 0; x < this.width; x += 10) {
                const y = this.height - 100 - Math.sin(x * 0.02) * 50;
                this.ctx.lineTo(x, y);
            }

            this.ctx.lineTo(this.width, this.height);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
            return;
        }

        // Draw actual terrain
        this.ctx.fillStyle = '#2d4a2e';
        this.ctx.strokeStyle = '#4a7c4e';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.height);

        for (let x = 0; x < this.terrain.length; x++) {
            const y = this.height - this.terrain[x];
            this.ctx.lineTo(x, y);
        }

        this.ctx.lineTo(this.width, this.height);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
    }

    setPlayers(players) {
        this.players = players;
    }

    setLocalPlayerId(playerId) {
        this.localPlayerId = playerId;
    }

    setAimAngle(angle) {
        this.aimAngle = angle;
    }

    setLavaPools(pools) {
        this.lavaPools = pools;
    }

    drawPlayers() {
        for (const player of this.players) {
            if (player.hp <= 0) continue;

            const { x, y } = player.position;
            const isLocalPlayer = player.id === this.localPlayerId;

            // Draw tank body
            this.ctx.fillStyle = player.type === 'human' ? '#4ecdc4' : '#ff6b6b';
            this.ctx.fillRect(x - 15, y - 10, 30, 15);

            // Draw tank turret
            this.ctx.fillStyle = player.type === 'human' ? '#3bb5ad' : '#ee5a6f';
            this.ctx.fillRect(x - 8, y - 15, 16, 8);

            // Draw barrel (rotated based on aim angle for local player)
            this.ctx.strokeStyle = this.ctx.fillStyle;
            this.ctx.lineWidth = 3;

            if (isLocalPlayer) {
                // Draw rotated barrel for local player
                const barrelLength = 20;
                const angleRad = (this.aimAngle * Math.PI) / 180;

                // Calculate barrel end position
                const endX = x + barrelLength * Math.cos(angleRad);
                const endY = y - 10 - barrelLength * Math.sin(angleRad);

                this.ctx.beginPath();
                this.ctx.moveTo(x, y - 10);
                this.ctx.lineTo(endX, endY);
                this.ctx.stroke();
            } else {
                // Draw static vertical barrel for other players
                this.ctx.beginPath();
                this.ctx.moveTo(x, y - 10);
                this.ctx.lineTo(x, y - 25);
                this.ctx.stroke();
            }

            // Draw player name
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '12px "Courier New"';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(player.name, x, y - 30);

            // Draw HP bar
            const barWidth = 40;
            const barHeight = 5;
            const hpPercent = player.hp / 100;

            // Background
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(x - barWidth / 2, y + 10, barWidth, barHeight);

            // HP fill
            this.ctx.fillStyle = hpPercent > 0.5 ? '#4ecdc4' : '#ff6b6b';
            this.ctx.fillRect(x - barWidth / 2, y + 10, barWidth * hpPercent, barHeight);
        }
    }

    drawProjectile(projectile) {
        if (!projectile) return;

        const { x, y } = projectile;

        // Draw projectile trail
        this.ctx.fillStyle = 'rgba(255, 200, 100, 0.3)';
        for (let i = 0; i < 5; i++) {
            this.ctx.beginPath();
            this.ctx.arc(x - i * 3, y + i * 2, 3 - i * 0.5, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Draw projectile
        this.ctx.fillStyle = '#ffd700';
        this.ctx.strokeStyle = '#ff8c00';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(x, y, 5, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
    }

    drawExplosion(explosion) {
        const { x, y, radius, frame, maxFrames } = explosion;
        const progress = frame / maxFrames;

        // Outer explosion
        const outerRadius = radius * (1 + progress * 0.5);
        const outerGradient = this.ctx.createRadialGradient(x, y, 0, x, y, outerRadius);
        outerGradient.addColorStop(0, `rgba(255, 200, 100, ${1 - progress})`);
        outerGradient.addColorStop(0.5, `rgba(255, 100, 50, ${0.5 - progress * 0.5})`);
        outerGradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
        this.ctx.fillStyle = outerGradient;
        this.ctx.beginPath();
        this.ctx.arc(x, y, outerRadius, 0, Math.PI * 2);
        this.ctx.fill();

        // Inner explosion
        const innerRadius = radius * 0.5 * (1 - progress * 0.3);
        const innerGradient = this.ctx.createRadialGradient(x, y, 0, x, y, innerRadius);
        innerGradient.addColorStop(0, `rgba(255, 255, 200, ${1 - progress})`);
        innerGradient.addColorStop(1, `rgba(255, 150, 0, ${0.3 - progress * 0.3})`);
        this.ctx.fillStyle = innerGradient;
        this.ctx.beginPath();
        this.ctx.arc(x, y, innerRadius, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawNapalmExplosion(explosion) {
        const { x, y, radius, frame, maxFrames } = explosion;
        const progress = frame / maxFrames;

        // Initial impact flash (first few frames)
        if (progress < 0.2) {
            const flashAlpha = (0.2 - progress) / 0.2;
            const flashRadius = radius * (0.5 + progress * 3);
            const flashGradient = this.ctx.createRadialGradient(x, y, 0, x, y, flashRadius);
            flashGradient.addColorStop(0, `rgba(255, 220, 100, ${flashAlpha * 0.9})`);
            flashGradient.addColorStop(0.5, `rgba(255, 150, 50, ${flashAlpha * 0.6})`);
            flashGradient.addColorStop(1, `rgba(255, 100, 0, 0)`);

            this.ctx.fillStyle = flashGradient;
            this.ctx.beginPath();
            this.ctx.arc(x, y, flashRadius, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Lava flowing downward and pooling
        const poolingProgress = Math.min(progress / 0.6, 1); // Pool faster in first 60% of animation
        const spreadWidth = radius * 2 * (0.5 + poolingProgress * 1.5);
        const poolHeight = radius * 0.4;

        // Find terrain height (approximate - in real implementation would query terrain array)
        const terrainY = y + radius * 0.2; // Slight offset below impact

        // Lava drips falling down
        if (progress < 0.5) {
            const dripCount = 6;
            for (let i = 0; i < dripCount; i++) {
                const dripX = x + (i - dripCount / 2) * (spreadWidth / dripCount) * 0.5;
                const dripFall = progress * radius * 3;
                const dripY = y + dripFall;
                const dripLength = 8 + Math.random() * 12;
                const dripAlpha = (1 - progress * 2) * 0.8;

                const dripGradient = this.ctx.createLinearGradient(dripX, dripY - dripLength, dripX, dripY);
                dripGradient.addColorStop(0, `rgba(255, 150, 0, 0)`);
                dripGradient.addColorStop(0.5, `rgba(255, 100, 0, ${dripAlpha})`);
                dripGradient.addColorStop(1, `rgba(200, 50, 0, ${dripAlpha})`);

                this.ctx.fillStyle = dripGradient;
                this.ctx.fillRect(dripX - 2, dripY - dripLength, 4, dripLength);
            }
        }

        // Main lava pool on ground
        const poolY = terrainY;
        const poolAlpha = Math.min(progress * 2, 1) * (1 - progress * 0.3);

        // Pool spreading horizontally
        const poolGradient = this.ctx.createRadialGradient(x, poolY, 0, x, poolY, spreadWidth / 2);
        poolGradient.addColorStop(0, `rgba(255, 180, 50, ${poolAlpha * 0.9})`);
        poolGradient.addColorStop(0.3, `rgba(255, 120, 0, ${poolAlpha * 0.8})`);
        poolGradient.addColorStop(0.6, `rgba(220, 60, 0, ${poolAlpha * 0.6})`);
        poolGradient.addColorStop(1, `rgba(150, 30, 0, 0)`);

        this.ctx.fillStyle = poolGradient;
        this.ctx.beginPath();
        this.ctx.ellipse(x, poolY, spreadWidth / 2, poolHeight, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Glowing hot spots in the pool
        if (poolingProgress > 0.3) {
            const hotSpotCount = 5;
            for (let i = 0; i < hotSpotCount; i++) {
                const offsetX = (i - hotSpotCount / 2) * (spreadWidth / hotSpotCount) * 0.8;
                const hotSpotX = x + offsetX;
                const hotSpotSize = radius * 0.2 * (0.8 + Math.random() * 0.4);
                const pulse = Math.sin(frame * 0.3 + i) * 0.3 + 0.7;

                const hotGradient = this.ctx.createRadialGradient(hotSpotX, poolY, 0, hotSpotX, poolY, hotSpotSize);
                hotGradient.addColorStop(0, `rgba(255, 220, 100, ${poolAlpha * pulse * 0.7})`);
                hotGradient.addColorStop(0.6, `rgba(255, 150, 0, ${poolAlpha * pulse * 0.4})`);
                hotGradient.addColorStop(1, `rgba(255, 100, 0, 0)`);

                this.ctx.fillStyle = hotGradient;
                this.ctx.beginPath();
                this.ctx.arc(hotSpotX, poolY, hotSpotSize, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        // Steam/smoke rising from lava pool
        if (poolingProgress > 0.4 && progress < 0.9) {
            const steamCount = Math.floor(8 * (1 - progress));
            for (let i = 0; i < steamCount; i++) {
                const steamX = x + (Math.random() - 0.5) * spreadWidth * 0.6;
                const steamY = poolY - (progress - 0.4) * radius * 3;
                const steamSize = 3 + Math.random() * 5;
                const steamAlpha = (1 - progress) * 0.4;

                this.ctx.fillStyle = `rgba(255, ${150 + Math.random() * 50}, 0, ${steamAlpha})`;
                this.ctx.beginPath();
                this.ctx.arc(steamX, steamY, steamSize, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    }

    drawTrajectoryPreview(startX, startY, angle, power, wind) {
        const angleRad = (angle * Math.PI) / 180;
        const initialVelocity = (power / 100) * 50;
        const vx0 = initialVelocity * Math.cos(angleRad);
        const vy0 = initialVelocity * Math.sin(angleRad);
        const gravity = 9.8;
        const dt = 0.1;

        this.ctx.strokeStyle = 'rgba(78, 205, 196, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY);

        let x = startX;
        let y = startY;
        let vx = vx0;
        let vy = vy0;
        let t = 0;

        while (y >= 0 && y <= this.height && t < 5) {
            vx += wind * 0.05 * dt;
            vy -= gravity * dt;
            x += vx * dt;
            y += vy * dt;
            t += dt;

            this.ctx.lineTo(x, y);

            if (x < 0 || x > this.width) break;
        }

        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    drawWindIndicator(wind) {
        const x = this.width / 2;
        const y = 30;
        const maxLength = 50;

        // Arrow
        const arrowLength = Math.abs(wind) * 2;
        const direction = wind > 0 ? 1 : -1;

        this.ctx.strokeStyle = '#4ecdc4';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x + arrowLength * direction, y);
        this.ctx.stroke();

        // Arrowhead
        if (arrowLength > 5) {
            this.ctx.beginPath();
            this.ctx.moveTo(x + arrowLength * direction, y);
            this.ctx.lineTo(x + (arrowLength - 8) * direction, y - 5);
            this.ctx.lineTo(x + (arrowLength - 8) * direction, y + 5);
            this.ctx.closePath();
            this.ctx.fillStyle = '#4ecdc4';
            this.ctx.fill();
        }
    }

    drawLava() {
        if (!this.lavaPools || this.lavaPools.length === 0) return;

        this.lavaAnimationFrame = (this.lavaAnimationFrame + 1) % 60;

        for (const pool of this.lavaPools) {
            const { x, y, radius, intensity } = pool;
            const pulse = Math.sin(this.lavaAnimationFrame * 0.1) * 0.2 + 0.8;

            // Dark shadow/base layer for depth
            const shadowRadius = radius * 1.3;
            const shadowGradient = this.ctx.createRadialGradient(x, y, 0, x, y, shadowRadius);
            shadowGradient.addColorStop(0, `rgba(80, 20, 0, ${intensity * 0.7})`);
            shadowGradient.addColorStop(0.7, `rgba(60, 15, 0, ${intensity * 0.5})`);
            shadowGradient.addColorStop(1, 'rgba(40, 10, 0, 0)');
            this.ctx.fillStyle = shadowGradient;
            this.ctx.beginPath();
            this.ctx.arc(x, y, shadowRadius, 0, Math.PI * 2);
            this.ctx.fill();

            // Outer heat glow
            const outerRadius = radius * 1.8;
            const outerGradient = this.ctx.createRadialGradient(x, y, 0, x, y, outerRadius);
            outerGradient.addColorStop(0, `rgba(255, 120, 0, ${intensity * 0.3 * pulse})`);
            outerGradient.addColorStop(0.4, `rgba(255, 80, 0, ${intensity * 0.2 * pulse})`);
            outerGradient.addColorStop(0.8, `rgba(200, 40, 0, ${intensity * 0.1})`);
            outerGradient.addColorStop(1, 'rgba(150, 20, 0, 0)');
            this.ctx.fillStyle = outerGradient;
            this.ctx.beginPath();
            this.ctx.arc(x, y, outerRadius, 0, Math.PI * 2);
            this.ctx.fill();

            // Main molten lava pool (elliptical for ground pooling effect)
            const poolWidth = radius * 1.4;
            const poolHeight = radius * 0.6;
            const mainGradient = this.ctx.createRadialGradient(x, y, 0, x, y, poolWidth);
            mainGradient.addColorStop(0, `rgba(255, 220, 80, ${intensity * 0.95})`);
            mainGradient.addColorStop(0.3, `rgba(255, 150, 30, ${intensity * 0.9})`);
            mainGradient.addColorStop(0.6, `rgba(220, 80, 0, ${intensity * 0.8})`);
            mainGradient.addColorStop(1, `rgba(180, 50, 0, ${intensity * 0.6})`);
            this.ctx.fillStyle = mainGradient;
            this.ctx.beginPath();
            this.ctx.ellipse(x, y, poolWidth, poolHeight, 0, 0, Math.PI * 2);
            this.ctx.fill();

            // Bubbling hot spots
            const bubbleCount = 3;
            for (let i = 0; i < bubbleCount; i++) {
                const bubblePhase = (this.lavaAnimationFrame + i * 20) % 60;
                const bubbleScale = Math.sin((bubblePhase / 60) * Math.PI) * 0.4 + 0.6;
                const bubbleX = x + (i - bubbleCount / 2) * (radius * 0.6);
                const bubbleY = y;
                const bubbleSize = radius * 0.25 * bubbleScale;
                const bubbleAlpha = Math.sin((bubblePhase / 60) * Math.PI) * 0.5 + 0.5;

                const bubbleGradient = this.ctx.createRadialGradient(bubbleX, bubbleY, 0, bubbleX, bubbleY, bubbleSize);
                bubbleGradient.addColorStop(0, `rgba(255, 240, 150, ${intensity * bubbleAlpha * 0.8})`);
                bubbleGradient.addColorStop(0.5, `rgba(255, 180, 50, ${intensity * bubbleAlpha * 0.5})`);
                bubbleGradient.addColorStop(1, 'rgba(255, 120, 0, 0)');

                this.ctx.fillStyle = bubbleGradient;
                this.ctx.beginPath();
                this.ctx.arc(bubbleX, bubbleY, bubbleSize, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // Fire/heat particles rising
            const particleCount = Math.floor(intensity * 6);
            for (let i = 0; i < particleCount; i++) {
                const particlePhase = (this.lavaAnimationFrame + i * 10) % 60;
                const particleProgress = particlePhase / 60;
                const particleX = x + (Math.sin(particlePhase * 0.3 + i) * radius * 0.7);
                const particleY = y - (particleProgress * radius * 2.5);
                const particleAlpha = (1 - particleProgress) * intensity * 0.7;
                const particleSize = (2 + Math.random() * 3) * (1 - particleProgress * 0.5);

                this.ctx.fillStyle = `rgba(255, ${150 + Math.random() * 80}, 0, ${particleAlpha})`;
                this.ctx.beginPath();
                this.ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // Bright center highlight (molten core)
            const coreSize = radius * 0.3 * pulse;
            const coreGradient = this.ctx.createRadialGradient(x, y, 0, x, y, coreSize);
            coreGradient.addColorStop(0, `rgba(255, 255, 200, ${intensity * 0.9})`);
            coreGradient.addColorStop(0.5, `rgba(255, 220, 100, ${intensity * 0.6})`);
            coreGradient.addColorStop(1, `rgba(255, 180, 50, 0)`);
            this.ctx.fillStyle = coreGradient;
            this.ctx.beginPath();
            this.ctx.arc(x, y, coreSize, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    addExplosion(x, y, radius, type = 'normal') {
        this.explosions.push({
            x,
            y,
            radius,
            frame: 0,
            maxFrames: 30,
            type: type
        });
    }

    update() {
        // Update explosions
        this.explosions = this.explosions.filter(explosion => {
            explosion.frame++;
            return explosion.frame < explosion.maxFrames;
        });
    }

    render() {
        this.clear();
        this.drawBackground();
        this.drawTerrain();
        this.drawLava();
        this.drawPlayers();

        // Draw explosions
        for (const explosion of this.explosions) {
            if (explosion.type === 'napalm') {
                this.drawNapalmExplosion(explosion);
            } else {
                this.drawExplosion(explosion);
            }
        }

        // Draw projectile if exists
        if (this.projectile) {
            this.drawProjectile(this.projectile);
        }
    }

    startAnimation() {
        const animate = () => {
            this.update();
            this.render();
            this.animationFrame = requestAnimationFrame(animate);
        };
        animate();
    }

    stopAnimation() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }
}
