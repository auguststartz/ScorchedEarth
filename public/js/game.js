// Main game client logic

class GameClient {
    constructor() {
        this.ws = new GameWebSocket();
        this.renderer = new GameRenderer('game-canvas');
        this.gameData = null;
        this.playerId = null;
        this.currentTurn = null;
        this.turnTimer = null;
        this.turnTimeRemaining = 45;

        this.initializeElements();
        this.attachEventListeners();
        this.loadGameData();
        this.setupWebSocket();
    }

    initializeElements() {
        // Controls
        this.weaponSelect = document.getElementById('weapon-select');
        this.angleSlider = document.getElementById('angle-slider');
        this.angleInput = document.getElementById('angle-input');
        this.powerSlider = document.getElementById('power-slider');
        this.powerInput = document.getElementById('power-input');
        this.fireBtn = document.getElementById('fire-btn');
        this.forfeitBtn = document.getElementById('forfeit-btn');

        // HUD
        this.player1Info = document.getElementById('player1-info');
        this.player2Info = document.getElementById('player2-info');
        this.turnIndicator = document.getElementById('turn-indicator');
        this.windIndicator = document.getElementById('wind-indicator');
        this.turnTimerDisplay = document.getElementById('turn-timer');

        // Chat
        this.chatMessages = document.getElementById('chat-messages');
        this.chatInput = document.getElementById('chat-input');
        this.chatSendBtn = document.getElementById('chat-send-btn');

        // Game Over Modal
        this.gameOverModal = document.getElementById('game-over-modal');
        this.winnerName = document.getElementById('winner-name');
        this.playAgainBtn = document.getElementById('play-again-btn');
        this.returnLobbyBtn = document.getElementById('return-lobby-btn');
    }

    attachEventListeners() {
        // Weapon selection feedback
        this.weaponSelect.addEventListener('change', (e) => {
            const weaponType = e.target.value;
            const localPlayer = this.gameData?.players?.find(p => p.id === this.playerId);
            if (localPlayer && localPlayer.weapons) {
                const ammo = localPlayer.weapons[weaponType];
                if (ammo !== -1 && ammo <= 0) {
                    this.addChatMessage('system', `No ${weaponType} ammo remaining!`);
                }
            }
        });

        // Sync sliders with inputs and update turret visual
        this.angleSlider.addEventListener('input', (e) => {
            this.angleInput.value = e.target.value;
            this.renderer.setAimAngle(parseInt(e.target.value));
        });
        this.angleInput.addEventListener('input', (e) => {
            this.angleSlider.value = e.target.value;
            this.renderer.setAimAngle(parseInt(e.target.value));
        });

        this.powerSlider.addEventListener('input', (e) => {
            this.powerInput.value = e.target.value;
        });
        this.powerInput.addEventListener('input', (e) => {
            this.powerSlider.value = e.target.value;
        });

        // Fire button
        this.fireBtn.addEventListener('click', () => this.handleFire());

        // Forfeit button
        this.forfeitBtn.addEventListener('click', () => this.handleForfeit());

        // Chat
        this.chatSendBtn.addEventListener('click', () => this.sendChat());
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendChat();
            }
        });

        // Game over actions
        this.playAgainBtn.addEventListener('click', () => {
            window.location.href = '/';
        });
        this.returnLobbyBtn.addEventListener('click', () => {
            window.location.href = '/';
        });

        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (this.isMyTurn()) {
                switch(e.key) {
                    case 'ArrowUp':
                        e.preventDefault();
                        this.angleInput.value = Math.min(180, parseInt(this.angleInput.value) + 1);
                        this.angleSlider.value = this.angleInput.value;
                        this.renderer.setAimAngle(parseInt(this.angleInput.value));
                        break;
                    case 'ArrowDown':
                        e.preventDefault();
                        this.angleInput.value = Math.max(0, parseInt(this.angleInput.value) - 1);
                        this.angleSlider.value = this.angleInput.value;
                        this.renderer.setAimAngle(parseInt(this.angleInput.value));
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        this.powerInput.value = Math.min(100, parseInt(this.powerInput.value) + 1);
                        this.powerSlider.value = this.powerInput.value;
                        break;
                    case 'ArrowLeft':
                        e.preventDefault();
                        this.powerInput.value = Math.max(0, parseInt(this.powerInput.value) - 1);
                        this.powerSlider.value = this.powerInput.value;
                        break;
                    case ' ':
                    case 'Enter':
                        e.preventDefault();
                        this.handleFire();
                        break;
                }
            }
        });
    }

    loadGameData() {
        const gameDataStr = sessionStorage.getItem('gameData');
        const playerId = sessionStorage.getItem('playerId');

        if (!gameDataStr) {
            console.error('No game data found, redirecting to lobby');
            window.location.href = '/';
            return;
        }

        this.gameData = JSON.parse(gameDataStr);
        this.playerId = playerId;

        console.log('Game data loaded:', this.gameData);

        // Initialize renderer with game data
        this.renderer.setLocalPlayerId(this.playerId); // Set which player is local
        this.renderer.setAimAngle(parseInt(this.angleInput.value)); // Set initial aim angle

        if (this.gameData.terrain && this.gameData.terrain.length > 0) {
            this.renderer.setTerrain(this.gameData.terrain);
        }
        if (this.gameData.players) {
            this.renderer.setPlayers(this.gameData.players);
            this.updatePlayerHUD();
            this.updateWeaponSelector(); // Update ammo counts
        }

        this.currentTurn = this.gameData.currentTurn;
        this.updateTurnIndicator();
        this.updateWindIndicator(this.gameData.wind || 0);

        // Start rendering
        this.renderer.startAnimation();
    }

    setupWebSocket() {
        // Register message handlers
        this.ws.on('GAME_STATE', (payload) => this.handleGameState(payload));
        this.ws.on('PROJECTILE_UPDATE', (payload) => this.handleProjectileUpdate(payload));
        this.ws.on('EXPLOSION_EVENT', (payload) => this.handleExplosion(payload));
        this.ws.on('TURN_END', (payload) => this.handleTurnEnd(payload));
        this.ws.on('GAME_OVER', (payload) => this.handleGameOver(payload));
        this.ws.on('CHAT_MESSAGE', (payload) => this.handleChatMessage(payload));
        this.ws.on('PLAYER_DISCONNECT', (payload) => this.handlePlayerDisconnect(payload));

        // Connect and start heartbeat
        this.ws.playerId = this.playerId;
        this.ws.connect().then(() => {
            this.ws.startHeartbeat();

            // Rejoin the game with our playerId and gameId
            console.log('Rejoining game...', { playerId: this.playerId, gameId: this.gameData.gameId });
            this.ws.send('REJOIN_GAME', {
                playerId: this.playerId,
                gameId: this.gameData.gameId
            });

            this.addChatMessage('system', 'Connected to game server');
        }).catch((error) => {
            console.error('Failed to connect:', error);
            this.addChatMessage('system', 'Failed to connect to server');
        });

        // Start turn timer
        this.startTurnTimer();
    }

    handleGameState(payload) {
        console.log('Game state update:', payload);

        if (payload.players) {
            // Update the master gameData.players object with server state
            this.gameData.players = payload.players;
            this.renderer.setPlayers(payload.players);
            this.updatePlayerHUD();
            this.updateWeaponSelector(); // Update ammo counts
        }

        if (payload.terrain) {
            // Update master terrain data
            this.gameData.terrain = payload.terrain;
            this.renderer.setTerrain(payload.terrain);
        }

        if (payload.wind !== undefined) {
            this.gameData.wind = payload.wind;
            this.updateWindIndicator(payload.wind);
        }

        if (payload.currentTurn) {
            this.currentTurn = payload.currentTurn;
            this.updateTurnIndicator();
            this.resetTurnTimer();
        }
    }

    handleProjectileUpdate(payload) {
        this.renderer.projectile = {
            x: payload.x,
            y: payload.y
        };
    }

    handleExplosion(payload) {
        console.log('Explosion:', payload);

        // Add explosion animation
        this.renderer.addExplosion(payload.x, payload.y, payload.radius);

        // Clear projectile
        this.renderer.projectile = null;

        // Update player HP
        if (payload.damage && this.gameData.players) {
            for (const dmg of payload.damage) {
                const player = this.gameData.players.find(p => p.id === dmg.playerId);
                if (player) {
                    player.hp = dmg.newHp;
                }
            }
            this.renderer.setPlayers(this.gameData.players);
            this.updatePlayerHUD();
        }
    }

    handleTurnEnd(payload) {
        console.log('Turn end:', payload);
        this.currentTurn = payload.nextTurn;
        this.updateTurnIndicator();
        this.resetTurnTimer();
    }

    handleGameOver(payload) {
        console.log('Game over:', payload);
        this.stopTurnTimer();

        // Show game over modal
        this.winnerName.textContent = payload.winner.name;
        document.getElementById('stat-turns').textContent = payload.statistics.totalTurns;

        const myStats = payload.statistics.players.find(p => p.id === this.playerId);
        if (myStats) {
            document.getElementById('stat-damage').textContent = myStats.damageDealt;
            document.getElementById('stat-accuracy').textContent =
                `${Math.round(myStats.accuracy * 100)}% (${myStats.shotsHit}/${myStats.shotsTotal})`;
        }

        this.gameOverModal.classList.remove('hidden');
    }

    handleChatMessage(payload) {
        const isOwn = payload.playerId === this.playerId;
        const messageType = isOwn ? 'own' : 'opponent';
        this.addChatMessage(messageType, payload.message, payload.playerName);
    }

    handlePlayerDisconnect(payload) {
        this.addChatMessage('system', `${payload.playerName} disconnected: ${payload.reason}`);
    }

    handleFire() {
        if (!this.isMyTurn()) {
            this.addChatMessage('system', 'Not your turn!');
            return;
        }

        const angle = parseInt(this.angleInput.value);
        const power = parseInt(this.powerInput.value);
        const weapon = this.weaponSelect.value;

        // Validate input
        if (isNaN(angle) || angle < 0 || angle > 180) {
            this.addChatMessage('system', 'Invalid angle (0-180)');
            return;
        }

        if (isNaN(power) || power < 0 || power > 100) {
            this.addChatMessage('system', 'Invalid power (0-100)');
            return;
        }

        // Check if player has ammo for selected weapon
        const localPlayer = this.gameData.players.find(p => p.id === this.playerId);
        if (localPlayer && localPlayer.weapons) {
            const ammo = localPlayer.weapons[weapon];
            if (ammo !== -1 && ammo <= 0) {
                this.addChatMessage('system', `Out of ${weapon} ammo! Select a different weapon.`);
                this.highlightWeaponSelector();
                return;
            }
        }

        console.log('Firing:', { angle, power, weapon });
        this.ws.sendPlayerAction(angle, power, weapon);

        // Disable controls
        this.fireBtn.disabled = true;
    }

    highlightWeaponSelector() {
        // Flash the weapon selector to draw attention
        this.weaponSelect.style.border = '2px solid #ff6b6b';
        setTimeout(() => {
            this.weaponSelect.style.border = '';
        }, 2000);
    }

    handleForfeit() {
        if (confirm('Are you sure you want to forfeit?')) {
            // Send forfeit message and return to lobby
            window.location.href = '/';
        }
    }

    sendChat() {
        const message = this.chatInput.value.trim();
        if (!message) return;

        if (message.length > 200) {
            this.addChatMessage('system', 'Message too long (max 200 characters)');
            return;
        }

        this.ws.sendChatMessage(message);
        this.chatInput.value = '';
    }

    addChatMessage(type, message, sender = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${type}`;

        if (sender) {
            const senderSpan = document.createElement('span');
            senderSpan.className = 'chat-sender';
            senderSpan.textContent = `${sender}:`;
            messageDiv.appendChild(senderSpan);
        }

        const textNode = document.createTextNode(message);
        messageDiv.appendChild(textNode);

        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    isMyTurn() {
        return this.currentTurn === this.playerId;
    }

    updateTurnIndicator() {
        const currentPlayer = this.gameData.players.find(p => p.id === this.currentTurn);
        if (currentPlayer) {
            document.querySelector('.turn-player').textContent = currentPlayer.name;
        }

        // Enable/disable controls based on turn
        const isMyTurn = this.isMyTurn();

        // Check if player has any ammo left
        let hasAnyAmmo = false;
        if (isMyTurn) {
            const localPlayer = this.gameData.players.find(p => p.id === this.playerId);
            if (localPlayer && localPlayer.weapons) {
                for (const ammo of Object.values(localPlayer.weapons)) {
                    if (ammo === -1 || ammo > 0) {
                        hasAnyAmmo = true;
                        break;
                    }
                }
            }
        }

        // Fire button: disabled if not your turn OR if out of all ammo
        this.fireBtn.disabled = !isMyTurn || !hasAnyAmmo;

        // Other controls: disabled if not your turn
        this.weaponSelect.disabled = !isMyTurn;
        this.angleSlider.disabled = !isMyTurn;
        this.angleInput.disabled = !isMyTurn;
        this.powerSlider.disabled = !isMyTurn;
        this.powerInput.disabled = !isMyTurn;

        if (isMyTurn) {
            if (hasAnyAmmo) {
                this.addChatMessage('system', 'Your turn!');
            } else {
                this.addChatMessage('system', 'Your turn! (Out of all ammo - turn will be skipped)');
            }
        }
    }

    updateWindIndicator(wind) {
        const windValue = document.querySelector('.wind-value');
        const windArrow = document.querySelector('.wind-arrow');

        windValue.textContent = Math.abs(wind).toFixed(1);

        if (wind > 0) {
            windArrow.textContent = '→';
        } else if (wind < 0) {
            windArrow.textContent = '←';
        } else {
            windArrow.textContent = '•';
        }
    }

    updatePlayerHUD() {
        if (!this.gameData.players || this.gameData.players.length < 2) return;

        const player1 = this.gameData.players[0];
        const player2 = this.gameData.players[1];

        // Update player 1
        this.player1Info.querySelector('.player-name').textContent = player1.name;
        this.player1Info.querySelector('.hp-text').textContent = `${player1.hp} HP`;
        const hp1Fill = this.player1Info.querySelector('.hp-fill');
        hp1Fill.style.width = `${player1.hp}%`;
        if (player1.hp < 30) {
            hp1Fill.classList.add('low');
        }

        // Update player 2
        this.player2Info.querySelector('.player-name').textContent = player2.name;
        this.player2Info.querySelector('.hp-text').textContent = `${player2.hp} HP`;
        const hp2Fill = this.player2Info.querySelector('.hp-fill');
        hp2Fill.style.width = `${player2.hp}%`;
        if (player2.hp < 30) {
            hp2Fill.classList.add('low');
        }
    }

    updateWeaponSelector() {
        const localPlayer = this.gameData.players.find(p => p.id === this.playerId);
        if (!localPlayer || !localPlayer.weapons) return;

        const weapons = localPlayer.weapons;
        const weaponNames = {
            standard: 'Standard Shell',
            heavy: 'Heavy Missile',
            cluster: 'Cluster Bomb',
            mirv: 'MIRV',
            digger: 'Digger'
        };

        // Store current selection
        const currentSelection = this.weaponSelect.value;

        // Clear and rebuild options
        this.weaponSelect.innerHTML = '';

        for (const [weaponType, weaponName] of Object.entries(weaponNames)) {
            const ammo = weapons[weaponType];
            const option = document.createElement('option');
            option.value = weaponType;

            // Display ammo count (∞ for unlimited)
            const ammoDisplay = ammo === -1 ? '∞' : ammo;
            option.textContent = `${weaponName} (${ammoDisplay})`;

            // Disable if out of ammo (except unlimited)
            if (ammo !== -1 && ammo <= 0) {
                option.disabled = true;
                option.textContent = `${weaponName} (Out of ammo)`;
            }

            this.weaponSelect.appendChild(option);
        }

        // Restore selection if still valid
        if (currentSelection && weapons[currentSelection] !== 0) {
            this.weaponSelect.value = currentSelection;
        } else {
            // Auto-select first available weapon
            for (const [weaponType, ammo] of Object.entries(weapons)) {
                if (ammo === -1 || ammo > 0) {
                    this.weaponSelect.value = weaponType;
                    break;
                }
            }
        }
    }

    startTurnTimer() {
        this.turnTimer = setInterval(() => {
            this.turnTimeRemaining--;

            const timerValue = document.querySelector('.timer-value');
            timerValue.textContent = this.turnTimeRemaining;

            if (this.turnTimeRemaining <= 10) {
                this.turnTimerDisplay.classList.add('warning');
            }

            if (this.turnTimeRemaining <= 0) {
                this.resetTurnTimer();
            }
        }, 1000);
    }

    resetTurnTimer() {
        this.turnTimeRemaining = 45;
        const timerValue = document.querySelector('.timer-value');
        timerValue.textContent = this.turnTimeRemaining;
        this.turnTimerDisplay.classList.remove('warning');
    }

    stopTurnTimer() {
        if (this.turnTimer) {
            clearInterval(this.turnTimer);
            this.turnTimer = null;
        }
    }
}

// Initialize game client when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new GameClient();
});
