// Lobby client logic

class LobbyClient {
    constructor() {
        this.ws = null;
        this.playerId = null;
        this.playerName = null;
        this.searchStartTime = null;
        this.timerInterval = null;

        this.initializeElements();
        this.attachEventListeners();
        this.loadPlayerName();
        this.fetchStats();

        // Update stats every 5 seconds
        setInterval(() => this.fetchStats(), 5000);

        // Load match history
        this.loadMatchHistory();
    }

    initializeElements() {
        // Setup section
        this.playerNameInput = document.getElementById('player-name');
        this.findMatchBtn = document.getElementById('find-match-btn');
        this.vsAiBtn = document.getElementById('vs-ai-btn');
        this.aiDifficultySelect = document.getElementById('ai-difficulty');
        this.errorMessage = document.getElementById('error-message');
        this.playerSetup = document.getElementById('player-setup');

        // Advanced settings
        this.toggleSettingsBtn = document.getElementById('toggle-settings-btn');
        this.advancedSettings = document.getElementById('advanced-settings');
        this.resetSettingsBtn = document.getElementById('reset-settings-btn');
        this.gravitySlider = document.getElementById('gravity-slider');
        this.gravityValue = document.getElementById('gravity-value');

        // Weapon inputs
        this.weaponInputs = {
            standard: {
                damage: document.getElementById('standard-damage'),
                ammo: document.getElementById('standard-ammo')
            },
            heavy: {
                damage: document.getElementById('heavy-damage'),
                ammo: document.getElementById('heavy-ammo')
            },
            cluster: {
                damage: document.getElementById('cluster-damage'),
                ammo: document.getElementById('cluster-ammo')
            },
            mirv: {
                damage: document.getElementById('mirv-damage'),
                ammo: document.getElementById('mirv-ammo')
            },
            digger: {
                damage: document.getElementById('digger-damage'),
                ammo: document.getElementById('digger-ammo')
            },
            napalm: {
                damage: document.getElementById('napalm-damage'),
                ammo: document.getElementById('napalm-ammo')
            }
        };

        // Matchmaking section
        this.matchmakingStatus = document.getElementById('matchmaking-status');
        this.queuePosition = document.getElementById('queue-position');
        this.elapsedTime = document.getElementById('elapsed-time');
        this.cancelQueueBtn = document.getElementById('cancel-queue-btn');

        // Timeout modal
        this.timeoutModal = document.getElementById('timeout-modal');
        this.playVsAiModal = document.getElementById('play-vs-ai-modal');
        this.aiDifficultyModalSelect = document.getElementById('ai-difficulty-modal');
        this.keepWaitingBtn = document.getElementById('keep-waiting-btn');

        // Stats
        this.onlineCount = document.getElementById('online-count');
        this.activeGames = document.getElementById('active-games');

        // Match history
        this.matchHistoryContainer = document.getElementById('match-history');
    }

    attachEventListeners() {
        this.findMatchBtn.addEventListener('click', () => this.findMatch());
        this.vsAiBtn.addEventListener('click', () => this.playVsAI());
        this.cancelQueueBtn.addEventListener('click', () => this.cancelQueue());
        this.playVsAiModal.addEventListener('click', () => this.acceptAIMatch());
        this.keepWaitingBtn.addEventListener('click', () => this.keepWaiting());

        // Advanced settings
        this.toggleSettingsBtn.addEventListener('click', () => this.toggleSettings());
        this.resetSettingsBtn.addEventListener('click', () => this.resetSettingsToDefaults());
        this.gravitySlider.addEventListener('input', (e) => {
            this.gravityValue.textContent = e.target.value;
        });

        // Allow Enter key to submit
        this.playerNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.findMatch();
            }
        });

        // Reload match history when player name changes
        this.playerNameInput.addEventListener('blur', () => {
            this.loadMatchHistory();
        });
    }

    loadPlayerName() {
        const savedName = localStorage.getItem('playerName');
        if (savedName) {
            this.playerNameInput.value = savedName;
        }
    }

    savePlayerName() {
        localStorage.setItem('playerName', this.playerName);
    }

    async fetchStats() {
        try {
            const response = await fetch('/health');
            const data = await response.json();

            this.onlineCount.textContent = data.queueSize || 0;
            this.activeGames.textContent = data.activeGames || 0;
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    }

    async loadMatchHistory() {
        const playerName = this.playerNameInput.value.trim();
        if (!playerName || playerName.length < 3) {
            // No name entered yet, show placeholder
            this.matchHistoryContainer.innerHTML = '<p class="placeholder">Enter your name to see match history</p>';
            return;
        }

        try {
            const response = await fetch(`/api/match-history/${encodeURIComponent(playerName)}`);
            const result = await response.json();

            if (!result.success || !result.data) {
                this.matchHistoryContainer.innerHTML = '<p class="placeholder">No match history yet. Play your first game!</p>';
                return;
            }

            this.displayMatchHistory(result.data);
        } catch (error) {
            console.error('Failed to load match history:', error);
            this.matchHistoryContainer.innerHTML = '<p class="placeholder">Failed to load match history</p>';
        }
    }

    displayMatchHistory(history) {
        const { totalGames, wins, losses, draws, recentMatches } = history;
        const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : 0;

        let html = `
            <div class="history-stats">
                <div class="stat-box">
                    <div class="stat-label">Total Games</div>
                    <div class="stat-number">${totalGames}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Win Rate</div>
                    <div class="stat-number">${winRate}%</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Record</div>
                    <div class="stat-number">${wins}W - ${losses}L - ${draws}D</div>
                </div>
            </div>
        `;

        if (recentMatches && recentMatches.length > 0) {
            html += '<div class="recent-matches"><h3>Recent Matches</h3>';

            for (const match of recentMatches.slice(0, 5)) {
                const date = new Date(match.timestamp).toLocaleDateString();
                const resultClass = match.result === 'win' ? 'win' : match.result === 'loss' ? 'loss' : 'draw';
                const resultText = match.result.toUpperCase();
                const opponentType = match.opponentType === 'ai' ?
                    `${match.opponentName} (${match.aiDifficulty || 'medium'})` :
                    match.opponentName;

                html += `
                    <div class="match-card ${resultClass}">
                        <div class="match-result">${resultText}</div>
                        <div class="match-opponent">vs ${opponentType}</div>
                        <div class="match-stats">
                            <span>DMG: ${match.playerStats.damageDealt}</span>
                            <span>ACC: ${(match.playerStats.accuracy * 100).toFixed(0)}%</span>
                        </div>
                        <div class="match-date">${date}</div>
                    </div>
                `;
            }

            html += '</div>';
        }

        this.matchHistoryContainer.innerHTML = html;
    }

    toggleSettings() {
        this.advancedSettings.classList.toggle('hidden');
        this.toggleSettingsBtn.textContent = this.advancedSettings.classList.contains('hidden')
            ? '► Advanced Settings'
            : '▼ Advanced Settings';
    }

    resetSettingsToDefaults() {
        this.gravitySlider.value = 980;
        this.gravityValue.textContent = '980';

        const defaults = {
            standard: { damage: 30, ammo: -1 },
            heavy: { damage: 50, ammo: 3 },
            cluster: { damage: 20, ammo: 3 },
            mirv: { damage: 35, ammo: 3 },
            digger: { damage: 40, ammo: 3 },
            napalm: { damage: 15, ammo: 2 }
        };

        for (const [weapon, values] of Object.entries(defaults)) {
            this.weaponInputs[weapon].damage.value = values.damage;
            this.weaponInputs[weapon].ammo.value = values.ammo;
        }
    }

    gatherCustomSettings() {
        return {
            gravity: parseInt(this.gravitySlider.value),
            weapons: {
                standard: {
                    damage: parseInt(this.weaponInputs.standard.damage.value),
                    ammo: parseInt(this.weaponInputs.standard.ammo.value)
                },
                heavy: {
                    damage: parseInt(this.weaponInputs.heavy.damage.value),
                    ammo: parseInt(this.weaponInputs.heavy.ammo.value)
                },
                cluster: {
                    damage: parseInt(this.weaponInputs.cluster.damage.value),
                    ammo: parseInt(this.weaponInputs.cluster.ammo.value)
                },
                mirv: {
                    damage: parseInt(this.weaponInputs.mirv.damage.value),
                    ammo: parseInt(this.weaponInputs.mirv.ammo.value)
                },
                digger: {
                    damage: parseInt(this.weaponInputs.digger.damage.value),
                    ammo: parseInt(this.weaponInputs.digger.ammo.value)
                },
                napalm: {
                    damage: parseInt(this.weaponInputs.napalm.damage.value),
                    ammo: parseInt(this.weaponInputs.napalm.ammo.value)
                }
            }
        };
    }

    connectWebSocket() {
        return new Promise((resolve, reject) => {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/ws`;

            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('WebSocket connected');
                resolve();
            };

            this.ws.onmessage = (event) => {
                this.handleMessage(JSON.parse(event.data));
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.showError('Connection error. Please try again.');
                reject(error);
            };

            this.ws.onclose = () => {
                console.log('WebSocket disconnected');
                this.stopTimer();
            };

            // Timeout if connection takes too long
            setTimeout(() => {
                if (this.ws.readyState !== WebSocket.OPEN) {
                    reject(new Error('Connection timeout'));
                }
            }, 5000);
        });
    }

    handleMessage(message) {
        console.log('Received message:', message);

        switch (message.type) {
            case 'MATCHMAKING_STATUS':
                this.handleMatchmakingStatus(message.payload);
                break;

            case 'GAME_START':
                this.handleGameStart(message.payload);
                break;

            case 'ERROR':
                this.showError(message.payload.message);
                break;

            default:
                console.warn('Unknown message type:', message.type);
        }
    }

    handleMatchmakingStatus(payload) {
        if (payload.status === 'searching') {
            this.queuePosition.textContent = payload.queuePosition || '-';
        } else if (payload.status === 'timeout') {
            this.showTimeoutModal();
        }
    }

    handleGameStart(payload) {
        console.log('Game starting:', payload);
        // Store game data and redirect to game page
        sessionStorage.setItem('gameData', JSON.stringify(payload));
        // Use the playerId from the server's GAME_START message
        sessionStorage.setItem('playerId', payload.playerId);
        window.location.href = '/game';
    }

    async findMatch() {
        const name = this.playerNameInput.value.trim();

        if (!this.validatePlayerName(name)) {
            return;
        }

        this.playerName = name;
        this.savePlayerName();

        try {
            await this.connectWebSocket();
            const customSettings = this.gatherCustomSettings();
            this.sendMessage({
                type: 'MATCHMAKING_REQUEST',
                timestamp: Date.now(),
                payload: {
                    playerName: this.playerName,
                    customSettings: customSettings
                }
            });

            this.showMatchmaking();
            this.startTimer();
        } catch (error) {
            this.showError('Failed to connect to server');
        }
    }

    async playVsAI() {
        const name = this.playerNameInput.value.trim();

        if (!this.validatePlayerName(name)) {
            return;
        }

        this.playerName = name;
        this.savePlayerName();

        try {
            await this.connectWebSocket();

            console.log('Sending PLAY_VS_COMPUTER message');

            // Get selected difficulty and custom settings
            const difficulty = this.aiDifficultySelect.value;
            const customSettings = this.gatherCustomSettings();

            // Request immediate AI match
            this.sendMessage({
                type: 'PLAY_VS_COMPUTER',
                timestamp: Date.now(),
                payload: {
                    playerName: this.playerName,
                    difficulty: difficulty,
                    customSettings: customSettings
                }
            });

            console.log('Message sent successfully');

        } catch (error) {
            console.error('Error in playVsAI:', error);
            this.showError('Failed to connect to server');
        }
    }

    validatePlayerName(name) {
        this.errorMessage.textContent = '';

        if (!name) {
            this.showError('Please enter a player name');
            return false;
        }

        if (name.length < 3) {
            this.showError('Player name must be at least 3 characters');
            return false;
        }

        if (name.length > 16) {
            this.showError('Player name must be at most 16 characters');
            return false;
        }

        if (!/^[a-zA-Z0-9 _-]+$/.test(name)) {
            this.showError('Player name contains invalid characters');
            return false;
        }

        return true;
    }

    cancelQueue() {
        if (this.ws) {
            this.ws.close();
        }
        this.hideMatchmaking();
        this.stopTimer();
    }

    acceptAIMatch() {
        this.hideTimeoutModal();

        // Get selected difficulty from modal
        const difficulty = this.aiDifficultyModalSelect.value;

        // Request AI match with selected difficulty
        this.sendMessage({
            type: 'PLAY_VS_COMPUTER',
            timestamp: Date.now(),
            payload: {
                playerName: this.playerName,
                difficulty: difficulty
            }
        });
    }

    keepWaiting() {
        this.hideTimeoutModal();
        // Continue waiting in queue
    }

    showMatchmaking() {
        this.playerSetup.classList.add('hidden');
        this.matchmakingStatus.classList.remove('hidden');
    }

    hideMatchmaking() {
        this.matchmakingStatus.classList.add('hidden');
        this.playerSetup.classList.remove('hidden');
    }

    showTimeoutModal() {
        this.timeoutModal.classList.remove('hidden');
    }

    hideTimeoutModal() {
        this.timeoutModal.classList.add('hidden');
    }

    showError(message) {
        this.errorMessage.textContent = message;
        setTimeout(() => {
            this.errorMessage.textContent = '';
        }, 5000);
    }

    startTimer() {
        this.searchStartTime = Date.now();
        this.timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.searchStartTime) / 1000);
            this.elapsedTime.textContent = elapsed;
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    sendMessage(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }
}

// Initialize lobby client when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new LobbyClient();
});