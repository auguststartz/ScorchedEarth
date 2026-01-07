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

    addExplosion(x, y, radius) {
        this.explosions.push({
            x,
            y,
            radius,
            frame: 0,
            maxFrames: 30
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
        this.drawPlayers();

        // Draw explosions
        for (const explosion of this.explosions) {
            this.drawExplosion(explosion);
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
