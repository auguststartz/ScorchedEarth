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
    }

    initializeElements() {
        // Setup section
        this.playerNameInput = document.getElementById('player-name');
        this.findMatchBtn = document.getElementById('find-match-btn');
        this.vsAiBtn = document.getElementById('vs-ai-btn');
        this.errorMessage = document.getElementById('error-message');
        this.playerSetup = document.getElementById('player-setup');

        // Matchmaking section
        this.matchmakingStatus = document.getElementById('matchmaking-status');
        this.queuePosition = document.getElementById('queue-position');
        this.elapsedTime = document.getElementById('elapsed-time');
        this.cancelQueueBtn = document.getElementById('cancel-queue-btn');

        // Timeout modal
        this.timeoutModal = document.getElementById('timeout-modal');
        this.playVsAiModal = document.getElementById('play-vs-ai-modal');
        this.keepWaitingBtn = document.getElementById('keep-waiting-btn');

        // Stats
        this.onlineCount = document.getElementById('online-count');
        this.activeGames = document.getElementById('active-games');
    }

    attachEventListeners() {
        this.findMatchBtn.addEventListener('click', () => this.findMatch());
        this.vsAiBtn.addEventListener('click', () => this.playVsAI());
        this.cancelQueueBtn.addEventListener('click', () => this.cancelQueue());
        this.playVsAiModal.addEventListener('click', () => this.acceptAIMatch());
        this.keepWaitingBtn.addEventListener('click', () => this.keepWaiting());

        // Allow Enter key to submit
        this.playerNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.findMatch();
            }
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
            this.sendMessage({
                type: 'MATCHMAKING_REQUEST',
                timestamp: Date.now(),
                payload: { playerName: this.playerName }
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

            // Request immediate AI match
            this.sendMessage({
                type: 'PLAY_VS_COMPUTER',
                timestamp: Date.now(),
                payload: {
                    playerName: this.playerName,
                    difficulty: 'medium'
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
        // Server will auto-start AI match after extended timeout
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