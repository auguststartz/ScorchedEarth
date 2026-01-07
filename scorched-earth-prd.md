# Product Requirements Document: Scorched Earth Multiplayer Web Game

**Version:** 1.0  
**Date:** January 6, 2026  
**Author:** August Startz  
**Project:** Scorched Earth Clone - Multiplayer Web Game  

---

## 1. Executive Summary

### 1.1 Overview
A browser-based multiplayer clone of the classic Scorched Earth artillery game, built with Bun and hosted at scorchedearth.auguststartz.com. Players engage in turn-based tank combat with realistic projectile physics, terrain destruction, and strategic gameplay.

### 1.2 Objectives
- Create an engaging multiplayer artillery game experience
- Implement intelligent matchmaking with human and AI opponents
- Deploy a scalable, containerized solution
- Provide low-latency real-time gameplay

### 1.3 Target Audience
- Retro gaming enthusiasts
- Casual multiplayer gamers
- Users seeking quick, strategic gameplay sessions

---

## 2. Product Overview

### 2.1 Core Concept
Players control tanks positioned on randomly generated terrain and take turns firing projectiles at opponents. Success requires calculating angle, power, and accounting for wind conditions. Terrain is destructible, creating dynamic battlefield conditions.

### 2.2 Key Features
- **Multiplayer Matchmaking**: Automated queue system pairing human players
- **AI Opponents**: Configurable computer players (0-2) with difficulty settings
- **Real-time Gameplay**: WebSocket-based communication for instant updates
- **Terrain Physics**: Procedurally generated destructible landscapes
- **Weapon Arsenal**: Multiple weapon types with unique effects
- **Wind System**: Dynamic environmental factor affecting projectiles
- **Player Progression**: Score tracking and match history

### 2.3 Success Criteria
- Average matchmaking time < 45 seconds
- Game sessions complete within 10-15 minutes
- 90%+ successful WebSocket connections
- Smooth gameplay at 60 FPS
- Zero data loss during player disconnections

---

## 3. Technical Architecture

### 3.1 Technology Stack

**Runtime & Framework:**
- Bun (v1.0+) - JavaScript runtime and bundler
- Elysia.js - Web framework for Bun
- WebSocket (native Bun support) - Real-time communication

**Frontend:**
- HTML5 Canvas - Game rendering
- Vanilla JavaScript/TypeScript - Game logic
- CSS3 - UI styling

**Backend:**
- Bun server with WebSocket support
- In-memory game state management
- SQLite (via Bun:sqlite) - Persistent storage for match history

**Deployment:**
- Docker containerized application
- Nginx reverse proxy (existing infrastructure)
- Hostinger VPS (existing setup at auguststartz.com)

### 3.2 System Architecture

```
┌─────────────────────────────────────────────────┐
│              Client Browser                     │
│  ┌──────────────┐         ┌─────────────────┐  │
│  │ Canvas       │         │  WebSocket      │  │
│  │ Renderer     │◄───────►│  Client         │  │
│  └──────────────┘         └─────────────────┘  │
└────────────────────┬────────────────────────────┘
                     │ WSS Connection
                     ▼
┌─────────────────────────────────────────────────┐
│           Bun Application Server                │
│  ┌──────────────────────────────────────────┐   │
│  │     WebSocket Server (Port 3000)         │   │
│  │  ┌──────────────┐    ┌────────────────┐  │   │
│  │  │ Matchmaking  │    │  Game Engine   │  │   │
│  │  │   Queue      │    │   (Physics,    │  │   │
│  │  │   Manager    │    │   Collision)   │  │   │
│  │  └──────────────┘    └────────────────┘  │   │
│  │  ┌──────────────┐    ┌────────────────┐  │   │
│  │  │  AI Engine   │    │  State Manager │  │   │
│  │  └──────────────┘    └────────────────┘  │   │
│  └──────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────┐   │
│  │     SQLite Database (Match History)      │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│    Docker Container on Hostinger VPS            │
│    nginx reverse proxy (scorchedearth.          │
│    auguststartz.com → localhost:3000)           │
└─────────────────────────────────────────────────┘
```

### 3.3 Data Flow

1. **Player Connection**: Client connects via WebSocket to wss://scorchedearth.auguststartz.com
2. **Matchmaking**: Player enters queue, server attempts human player match
3. **Game Initialization**: Server creates game instance, sends terrain and player data
4. **Turn Execution**: Client sends action, server validates, updates state, broadcasts to all players
5. **Physics Calculation**: Server computes projectile trajectory, collision, damage
6. **State Synchronization**: All clients receive updated game state
7. **Match Completion**: Results stored in SQLite, players returned to lobby

---

## 4. Functional Requirements

### 4.1 Matchmaking System

#### 4.1.1 Queue Management
- **FR-MM-001**: When a player connects, they are automatically placed in the matchmaking queue
- **FR-MM-002**: System attempts to pair two human players from the queue
- **FR-MM-003**: After 30 seconds without a match, player receives options:
  - "Play vs Computer" (starts immediately with AI opponent)
  - "Keep Waiting" (extends queue time by 60 seconds)
- **FR-MM-004**: If player selects "Keep Waiting" and no match after additional 60 seconds, auto-start with AI
- **FR-MM-005**: Players can cancel queue and return to lobby at any time
- **FR-MM-006**: Display current queue position and estimated wait time

#### 4.1.2 AI Opponent Configuration
- **FR-MM-007**: Support 0-2 AI opponents per game
- **FR-MM-008**: AI difficulty levels: Easy, Medium, Hard
- **FR-MM-009**: Default configuration: 1 AI opponent at Medium difficulty
- **FR-MM-010**: Players can configure AI settings before starting vs Computer

### 4.2 Game Mechanics

#### 4.2.1 Core Gameplay
- **FR-GM-001**: Turn-based gameplay with 45-second timer per turn
- **FR-GM-002**: Players select angle (0-180°) and power (0-100%)
- **FR-GM-003**: Real-time wind indicator affecting projectile trajectory (-20 to +20 units)
- **FR-GM-004**: Each player starts with 100 HP
- **FR-GM-005**: Direct hits cause 15-50 damage based on weapon and impact angle
- **FR-GM-006**: Splash damage affects nearby tanks (radius-based calculation)
- **FR-GM-007**: Terrain destruction creates permanent landscape changes
- **FR-GM-008**: Player eliminated when HP reaches 0
- **FR-GM-009**: Game ends when only one player remains or maximum 50 turns reached

#### 4.2.2 Weapons System
- **FR-WP-001**: **Standard Shell**: Basic projectile, 30 damage, small splash radius
- **FR-WP-002**: **Heavy Missile**: High damage (50), medium splash radius, slower
- **FR-WP-003**: **Cluster Bomb**: Splits into 5 bomblets, 20 damage each, wide area
- **FR-WP-004**: **MIRV**: 3 independent projectiles with separate impacts
- **FR-WP-005**: **Digger**: Burrows through terrain before exploding
- **FR-WP-006**: Each weapon has limited ammunition (5 standard, 3 special per game)
- **FR-WP-007**: Players select weapon before firing

#### 4.2.3 Terrain Generation
- **FR-TR-001**: Procedurally generated terrain using Perlin noise algorithm
- **FR-TR-002**: Terrain height varies between 20-80% of canvas height
- **FR-TR-003**: Minimum distance between players: 300 pixels
- **FR-TR-004**: Terrain rendered as destructible bitmap with collision detection
- **FR-TR-005**: New terrain generated for each match
- **FR-TR-006**: Terrain themes: Desert, Arctic, Volcanic (visual variation only)

#### 4.2.4 Physics Engine
- **FR-PH-001**: Projectile motion calculated using kinematic equations
- **FR-PH-002**: Gravity constant: 9.8 m/s²
- **FR-PH-003**: Wind force applied continuously during flight
- **FR-PH-004**: Collision detection at pixel level
- **FR-PH-005**: Explosion radius calculated from weapon type
- **FR-PH-006**: Tank sliding on steep slopes (>45° angles)
- **FR-PH-007**: Server-authoritative physics calculations

### 4.3 User Interface

#### 4.3.1 Lobby Screen
- **FR-UI-001**: Player name input field (3-16 characters)
- **FR-UI-002**: "Find Match" button to enter queue
- **FR-UI-003**: "Play vs Computer" button for immediate AI match
- **FR-UI-004**: Match history display (last 10 games)
- **FR-UI-005**: Current online player count

#### 4.3.2 Matchmaking Screen
- **FR-UI-006**: Queue position indicator
- **FR-UI-007**: Animated "Searching for opponent" status
- **FR-UI-008**: Countdown timer (30 seconds)
- **FR-UI-009**: Modal popup with "Play vs Computer" / "Keep Waiting" options
- **FR-UI-010**: "Cancel" button to exit queue

#### 4.3.3 Game Screen
- **FR-UI-011**: Canvas area (1200x600px) with game rendering
- **FR-UI-012**: Player HUD showing:
  - Current player indicator
  - HP bar for all players
  - Weapon selection menu
  - Ammunition count
  - Wind speed/direction indicator
  - Turn timer
- **FR-UI-013**: Angle/power adjustment controls:
  - Keyboard arrows: Fine adjustment (±1°, ±1%)
  - Mouse drag: Visual arc trajectory preview
  - Numeric input fields
- **FR-UI-014**: "Fire" button (disabled during opponent's turn)
- **FR-UI-015**: Chat window for text messages between players
- **FR-UI-016**: "Forfeit" button to concede match

#### 4.3.4 End Game Screen
- **FR-UI-017**: Winner announcement with animation
- **FR-UI-018**: Match statistics:
  - Total turns
  - Damage dealt per player
  - Accuracy percentage
  - Final scores
- **FR-UI-019**: "Play Again" button (re-enters matchmaking)
- **FR-UI-020**: "Return to Lobby" button

### 4.4 AI Opponents

#### 4.4.1 AI Behavior
- **FR-AI-001**: **Easy AI**: Random angles/power with 40% accuracy
- **FR-AI-002**: **Medium AI**: Basic trajectory calculation, 65% accuracy, 2-second turn delay
- **FR-AI-003**: **Hard AI**: Advanced physics calculations, 85% accuracy, accounts for wind, 1-second delay
- **FR-AI-004**: AI considers terrain obstacles and chooses arc path (high/low)
- **FR-AI-005**: AI weapon selection based on distance and situation
- **FR-AI-006**: AI names: "CPU-Alpha", "CPU-Beta", "CPU-Gamma"
- **FR-AI-007**: AI turns execute within 3-5 seconds (simulates human timing)

#### 4.4.2 AI Difficulty Balancing
- **FR-AI-008**: Easy AI occasionally shoots in wrong direction (10% chance)
- **FR-AI-009**: Medium AI ignores wind 30% of the time
- **FR-AI-010**: Hard AI never misses stationary targets unless blocked by terrain
- **FR-AI-011**: All AI difficulties take random "bad shots" 5% of the time (human-like)

### 4.5 Real-Time Communication

#### 4.5.1 WebSocket Protocol
- **FR-WS-001**: Secure WebSocket connection (WSS) over HTTPS
- **FR-WS-002**: Automatic reconnection on disconnect (3 attempts, 2-second intervals)
- **FR-WS-003**: Heartbeat ping every 10 seconds to maintain connection
- **FR-WS-004**: Client-side connection timeout: 30 seconds
- **FR-WS-005**: Message format: JSON with type, payload, timestamp

#### 4.5.2 Message Types
- **FR-WS-006**: `PLAYER_CONNECT`: Initial connection handshake
- **FR-WS-007**: `MATCHMAKING_STATUS`: Queue updates
- **FR-WS-008**: `GAME_START`: Game initialization data
- **FR-WS-009**: `GAME_STATE`: Complete game state synchronization
- **FR-WS-010**: `PLAYER_ACTION`: Turn submission (angle, power, weapon)
- **FR-WS-011**: `PROJECTILE_UPDATE`: Frame-by-frame projectile position
- **FR-WS-012**: `EXPLOSION_EVENT`: Impact and damage notification
- **FR-WS-013**: `TURN_END`: Turn completion and next player indicator
- **FR-WS-014**: `GAME_OVER`: Match completion with results
- **FR-WS-015**: `CHAT_MESSAGE`: Player-to-player text communication
- **FR-WS-016**: `PLAYER_DISCONNECT`: Opponent disconnection notification

#### 4.5.3 Error Handling
- **FR-WS-017**: Graceful degradation if WebSocket fails (display error, retry)
- **FR-WS-018**: Player disconnect during match: AI takes over for 60 seconds
- **FR-WS-019**: If disconnected player doesn't reconnect: Auto-forfeit
- **FR-WS-020**: Server crash recovery: Games saved to SQLite every turn

### 4.6 Data Persistence

#### 4.6.1 Match History
- **FR-DB-001**: Store completed matches in SQLite database
- **FR-DB-002**: Match record includes:
  - Match ID (UUID)
  - Player names
  - Winner
  - Total turns
  - Damage dealt by each player
  - Accuracy statistics
  - Timestamp
  - Match duration
- **FR-DB-003**: Player statistics aggregate across all matches:
  - Total games played
  - Win/loss record
  - Average accuracy
  - Favorite weapon
- **FR-DB-004**: Match history viewable in lobby (last 10 games per player)
- **FR-DB-005**: Database cleanup: Archive matches older than 90 days

#### 4.6.2 Session Management
- **FR-DB-006**: Anonymous sessions (no user accounts required)
- **FR-DB-007**: Player names tracked by browser localStorage
- **FR-DB-008**: Optional: Cookie-based session persistence for returning players

---

## 5. Non-Functional Requirements

### 5.1 Performance
- **NFR-PR-001**: Game rendering at 60 FPS
- **NFR-PR-002**: WebSocket latency < 100ms
- **NFR-PR-003**: Matchmaking response time < 2 seconds
- **NFR-PR-004**: Turn processing time < 500ms
- **NFR-PR-005**: Page load time < 3 seconds
- **NFR-PR-006**: Support up to 50 concurrent games (100 active connections)

### 5.2 Scalability
- **NFR-SC-001**: Horizontal scaling: Multiple Docker containers behind load balancer (future)
- **NFR-SC-002**: In-memory game state with Redis backup option (future)
- **NFR-SC-003**: WebSocket session stickiness for load balancing

### 5.3 Security
- **NFR-SE-001**: WSS (WebSocket Secure) protocol enforced
- **NFR-SE-002**: Input validation on all client submissions
- **NFR-SE-003**: Rate limiting: 10 actions per second per client
- **NFR-SE-004**: Server-authoritative game logic (prevent cheating)
- **NFR-SE-005**: SQL injection prevention (parameterized queries)
- **NFR-SE-006**: XSS protection on chat messages
- **NFR-SE-007**: No sensitive data transmission (no authentication required)

### 5.4 Reliability
- **NFR-RE-001**: 99% uptime target
- **NFR-RE-002**: Automated Docker container restart on failure
- **NFR-RE-003**: Database backups daily at 2 AM UTC
- **NFR-RE-004**: Error logging to file system with rotation
- **NFR-RE-005**: Graceful shutdown handling (ongoing games saved)

### 5.5 Compatibility
- **NFR-CM-001**: Browser support: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **NFR-CM-002**: Responsive design: 1280x720 minimum resolution
- **NFR-CM-003**: Desktop-first (mobile support in future version)
- **NFR-CM-004**: No plugin/extension requirements

### 5.6 Maintainability
- **NFR-MA-001**: TypeScript for type safety
- **NFR-MA-002**: ESLint and Prettier for code consistency
- **NFR-MA-003**: Comprehensive code comments
- **NFR-MA-004**: Modular architecture (separate physics, AI, networking modules)
- **NFR-MA-005**: Unit tests for core game logic (target 80% coverage)

---

## 6. Deployment & Hosting

### 6.1 Docker Configuration

#### 6.1.1 Dockerfile
```dockerfile
FROM oven/bun:1.0

WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy application code
COPY . .

# Build application
RUN bun run build

# Expose WebSocket port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun run healthcheck.js || exit 1

# Start server
CMD ["bun", "run", "src/server.ts"]
```

#### 6.1.2 docker-compose.yml
```yaml
version: '3.8'

services:
  scorched-earth:
    build: .
    container_name: scorched-earth-game
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - LOG_LEVEL=info
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    networks:
      - app-network

networks:
  app-network:
    external: true
```

### 6.2 Nginx Configuration

#### 6.2.1 scorchedearth.auguststartz.com
```nginx
server {
    listen 80;
    server_name scorchedearth.auguststartz.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name scorchedearth.auguststartz.com;

    ssl_certificate /etc/letsencrypt/live/auguststartz.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/auguststartz.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket timeouts
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }
}
```

### 6.3 Deployment Process

#### 6.3.1 Initial Deployment
1. Clone repository to VPS: `/var/www/scorched-earth`
2. Build Docker image: `docker-compose build`
3. Start container: `docker-compose up -d`
4. Add nginx configuration to `/etc/nginx/sites-available/`
5. Create symbolic link: `ln -s /etc/nginx/sites-available/scorchedearth /etc/nginx/sites-enabled/`
6. Test nginx: `nginx -t`
7. Reload nginx: `systemctl reload nginx`
8. Verify SSL certificate coverage (should be included in wildcard *.auguststartz.com)

#### 6.3.2 Continuous Deployment
1. Push code to Git repository
2. SSH into VPS
3. Navigate to project directory
4. Pull latest changes: `git pull origin main`
5. Rebuild container: `docker-compose build`
6. Restart with zero-downtime: `docker-compose up -d --no-deps --build scorched-earth`
7. Verify health: `docker logs scorched-earth-game --tail 50`

### 6.4 Monitoring & Logging

#### 6.4.1 Application Logging
- **Log Levels**: DEBUG, INFO, WARN, ERROR
- **Log Location**: `/app/logs/app.log` (mounted volume)
- **Log Rotation**: Daily, keep 7 days
- **Log Format**: JSON with timestamp, level, message, context

#### 6.4.2 Health Checks
- **Endpoint**: `GET /health`
- **Response**: `{ "status": "healthy", "uptime": 12345, "activeGames": 5 }`
- **Docker Health Check**: Every 30 seconds
- **Alert Conditions**: 3 consecutive failures

#### 6.4.3 Metrics to Track
- Active WebSocket connections
- Games in progress
- Average matchmaking time
- Average game duration
- Server CPU/Memory usage
- Database query times
- Error rates

---

## 7. Project Phases

### Phase 1: Core Infrastructure (Week 1-2)
**Goals:** Establish foundation and basic networking

**Deliverables:**
- Bun server with WebSocket support
- Basic HTML/Canvas rendering
- Docker containerization
- Deployment to scorchedearth.auguststartz.com
- Simple lobby UI
- Matchmaking queue (human-human only)

**Success Criteria:**
- Two players can connect and see each other
- WebSocket communication functional
- Site accessible at subdomain with SSL

---

### Phase 2: Game Mechanics (Week 3-4)
**Goals:** Implement core gameplay

**Deliverables:**
- Terrain generation system
- Physics engine (projectile motion, collisions)
- Turn-based gameplay loop
- Basic weapon (standard shell)
- Damage calculation and HP system
- Wind system
- Victory/defeat conditions

**Success Criteria:**
- Complete game playable between two humans
- Projectiles follow realistic physics
- Terrain destruction works correctly
- Games conclude with clear winner

---

### Phase 3: AI & Enhanced Gameplay (Week 5-6)
**Goals:** Add computer opponents and weapon variety

**Deliverables:**
- AI opponent implementation (3 difficulty levels)
- Matchmaking timeout logic (30-second wait)
- "Play vs Computer" option
- Additional weapons (5 total)
- Weapon selection UI
- Advanced trajectory prediction for AI

**Success Criteria:**
- AI provides competitive gameplay at all levels
- Matchmaking gracefully handles no-opponent scenarios
- All weapons function with unique characteristics

---

### Phase 4: Polish & Persistence (Week 7-8)
**Goals:** Enhance UX and add data persistence

**Deliverables:**
- SQLite database integration
- Match history tracking
- Player statistics
- Chat system
- Sound effects and visual polish
- Explosion animations
- Responsive UI improvements
- End-game screen with statistics

**Success Criteria:**
- Match data persists across sessions
- Players can view historical performance
- Game feels polished and complete

---

### Phase 5: Testing & Optimization (Week 9-10)
**Goals:** Ensure stability and performance

**Deliverables:**
- Unit tests for game logic
- Load testing (50 concurrent games)
- Performance optimization
- Bug fixes from testing
- Documentation (API, deployment guide)
- Error handling improvements
- Monitoring dashboard

**Success Criteria:**
- All critical bugs resolved
- Performance targets met
- System handles target load
- Comprehensive documentation complete

---

## 8. Technical Specifications

### 8.1 File Structure

```
scorched-earth/
├── src/
│   ├── server.ts                 # Main Bun server
│   ├── websocket/
│   │   ├── handler.ts            # WebSocket connection handling
│   │   └── messages.ts           # Message type definitions
│   ├── game/
│   │   ├── engine.ts             # Core game loop
│   │   ├── physics.ts            # Projectile physics calculations
│   │   ├── terrain.ts            # Terrain generation and collision
│   │   ├── weapons.ts            # Weapon definitions and behavior
│   │   └── state.ts              # Game state management
│   ├── ai/
│   │   ├── easy.ts               # Easy AI implementation
│   │   ├── medium.ts             # Medium AI implementation
│   │   └── hard.ts               # Hard AI implementation
│   ├── matchmaking/
│   │   ├── queue.ts              # Player queue management
│   │   └── matcher.ts            # Human-to-human matching logic
│   ├── database/
│   │   ├── db.ts                 # SQLite connection and queries
│   │   └── schema.sql            # Database schema
│   └── utils/
│       ├── logger.ts             # Logging utility
│       └── validator.ts          # Input validation
├── public/
│   ├── index.html                # Lobby page
│   ├── game.html                 # Game page
│   ├── css/
│   │   ├── main.css              # Global styles
│   │   └── game.css              # Game-specific styles
│   ├── js/
│   │   ├── lobby.js              # Lobby UI logic
│   │   ├── game.js               # Game client logic
│   │   ├── renderer.js           # Canvas rendering
│   │   └── websocket.js          # WebSocket client
│   └── assets/
│       ├── sounds/               # Sound effects
│       └── images/               # UI images
├── tests/
│   ├── physics.test.ts           # Physics engine tests
│   ├── ai.test.ts                # AI behavior tests
│   └── matchmaking.test.ts       # Matchmaking tests
├── Dockerfile
├── docker-compose.yml
├── package.json
├── bun.lockb
├── tsconfig.json
└── README.md
```

### 8.2 Key Algorithms

#### 8.2.1 Projectile Trajectory Calculation
```typescript
interface TrajectoryPoint {
  x: number;
  y: number;
  t: number;
}

function calculateTrajectory(
  angle: number,      // degrees (0-180)
  power: number,      // percentage (0-100)
  wind: number,       // force (-20 to +20)
  startX: number,
  startY: number
): TrajectoryPoint[] {
  const angleRad = (angle * Math.PI) / 180;
  const initialVelocity = (power / 100) * 50; // Max velocity: 50 units/sec
  const vx0 = initialVelocity * Math.cos(angleRad);
  const vy0 = initialVelocity * Math.sin(angleRad);
  const gravity = 9.8;
  const dt = 0.016; // 60 FPS
  
  const points: TrajectoryPoint[] = [];
  let t = 0;
  let x = startX;
  let y = startY;
  let vx = vx0;
  let vy = vy0;
  
  while (y >= 0 && t < 10) { // Max 10 seconds flight time
    points.push({ x, y, t });
    
    // Apply wind force
    vx += wind * 0.05 * dt;
    
    // Apply gravity
    vy -= gravity * dt;
    
    // Update position
    x += vx * dt;
    y += vy * dt;
    
    t += dt;
    
    // Check terrain collision (handled by collision detection system)
  }
  
  return points;
}
```

#### 8.2.2 Terrain Generation (Perlin Noise)
```typescript
function generateTerrain(width: number, height: number): number[] {
  const terrain: number[] = [];
  const octaves = 4;
  const persistence = 0.5;
  
  for (let x = 0; x < width; x++) {
    let amplitude = 1;
    let frequency = 0.01;
    let noiseHeight = 0;
    
    for (let octave = 0; octave < octaves; octave++) {
      const sampleX = x * frequency;
      const perlinValue = perlin(sampleX);
      noiseHeight += perlinValue * amplitude;
      
      amplitude *= persistence;
      frequency *= 2;
    }
    
    // Normalize to height range (20-80% of canvas)
    const terrainHeight = ((noiseHeight + 1) / 2) * (height * 0.6) + (height * 0.2);
    terrain.push(Math.floor(terrainHeight));
  }
  
  return terrain;
}
```

#### 8.2.3 AI Targeting (Medium Difficulty)
```typescript
function calculateAIShot(
  aiX: number,
  aiY: number,
  targetX: number,
  targetY: number,
  wind: number
): { angle: number; power: number } {
  const dx = targetX - aiX;
  const dy = aiY - targetY; // Inverted Y
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Calculate ideal angle (ignoring wind for medium difficulty 30% of time)
  const useWind = Math.random() > 0.3;
  const windAdjustment = useWind ? wind * 2 : 0;
  
  let angle = Math.atan2(dy, dx) * (180 / Math.PI);
  angle = Math.max(0, Math.min(180, angle + windAdjustment));
  
  // Calculate power based on distance
  const power = Math.min(100, (distance / 500) * 100);
  
  // Add accuracy variance (±5 degrees, ±10 power)
  angle += (Math.random() - 0.5) * 10;
  const finalPower = power + (Math.random() - 0.5) * 20;
  
  return {
    angle: Math.max(0, Math.min(180, angle)),
    power: Math.max(0, Math.min(100, finalPower))
  };
}
```

### 8.3 Database Schema

```sql
CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    player1_name TEXT NOT NULL,
    player2_name TEXT NOT NULL,
    player1_type TEXT NOT NULL, -- 'human' or 'ai'
    player2_type TEXT NOT NULL,
    winner TEXT NOT NULL,
    total_turns INTEGER NOT NULL,
    player1_damage INTEGER NOT NULL,
    player1_accuracy REAL NOT NULL,
    player2_damage INTEGER NOT NULL,
    player2_accuracy REAL NOT NULL,
    match_duration INTEGER NOT NULL, -- seconds
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS player_stats (
    player_name TEXT PRIMARY KEY,
    total_games INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    total_damage INTEGER DEFAULT 0,
    total_shots INTEGER DEFAULT 0,
    total_hits INTEGER DEFAULT 0,
    last_played DATETIME
);

CREATE INDEX idx_matches_created ON matches(created_at DESC);
CREATE INDEX idx_matches_player ON matches(player1_name, player2_name);
```

---

## 9. User Stories

### 9.1 Core Gameplay Stories

**US-001: Matchmaking**
- **As a** player
- **I want to** be matched with another human player automatically
- **So that** I can enjoy competitive gameplay
- **Acceptance Criteria:**
  - Click "Find Match" and enter queue
  - See queue status and position
  - Match found within 30 seconds or receive options
  - Game starts immediately when matched

**US-002: Playing vs AI**
- **As a** player
- **I want to** play against a computer opponent when no humans are available
- **So that** I don't have to wait indefinitely
- **Acceptance Criteria:**
  - Receive prompt after 30 seconds of waiting
  - Select "Play vs Computer" to start immediately
  - Choose AI difficulty level
  - AI behaves realistically with appropriate challenge

**US-003: Firing Projectiles**
- **As a** player
- **I want to** aim and fire my tank's weapon
- **So that** I can damage my opponent
- **Acceptance Criteria:**
  - Adjust angle and power using controls
  - See trajectory preview
  - Click "Fire" to launch projectile
  - Watch projectile arc through air with wind effects
  - See explosion and damage numbers

**US-004: Turn-Based Combat**
- **As a** player
- **I want to** take turns with my opponent
- **So that** gameplay is strategic and fair
- **Acceptance Criteria:**
  - Clear indicator of whose turn it is
  - 45-second timer per turn
  - Cannot fire during opponent's turn
  - Turn automatically passes after timer expires

**US-005: Viewing Match History**
- **As a** player
- **I want to** see my past game results
- **So that** I can track my performance
- **Acceptance Criteria:**
  - View last 10 matches in lobby
  - See winner, score, and statistics
  - View overall win/loss record
  - See accuracy and damage statistics

### 9.2 Secondary Stories

**US-006: Weapon Selection**
- **As a** player
- **I want to** choose from different weapons
- **So that** I can adapt my strategy to the situation
- **Acceptance Criteria:**
  - View available weapons with ammo counts
  - Select weapon before firing
  - Each weapon has unique behavior
  - Cannot select weapon with 0 ammo

**US-007: Communication**
- **As a** player
- **I want to** send chat messages to my opponent
- **So that** I can interact socially during the game
- **Acceptance Criteria:**
  - Type message in chat box
  - Send message visible to opponent
  - See opponent's messages in real-time
  - Chat persists during match only

**US-008: Reconnection**
- **As a** player experiencing connection issues
- **I want to** automatically reconnect to my game
- **So that** I don't lose progress due to temporary disconnects
- **Acceptance Criteria:**
  - Connection drop detected
  - Automatic reconnection attempts
  - Resume game at current state
  - If reconnection fails, opponent notified

---

## 10. Success Metrics

### 10.1 Key Performance Indicators (KPIs)

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Average Matchmaking Time | < 45 seconds | Server logs |
| WebSocket Connection Success Rate | > 90% | Connection attempts vs. successes |
| Game Completion Rate | > 85% | Finished games / Started games |
| Average Game Duration | 10-15 minutes | Match records |
| Player Retention (7-day) | > 30% | Returning players / Total unique players |
| Server Response Time | < 500ms | Request timing logs |
| AI Win Rate (Medium) | 40-60% | AI victories / AI matches |
| Error Rate | < 1% | Error logs / Total requests |

### 10.2 User Satisfaction

- **Qualitative Feedback**: Survey link on end-game screen
- **Rage Quits**: Track early forfeit rate (target < 10%)
- **Repeat Play**: Percentage of players who play 3+ games (target > 50%)

---

## 11. Risks & Mitigations

| Risk | Impact | Probability | Mitigation Strategy |
|------|--------|-------------|---------------------|
| WebSocket reliability issues | High | Medium | Implement robust reconnection logic, fallback to long-polling if needed |
| AI too difficult/easy | Medium | Medium | Extensive playtesting, user feedback loop, difficulty fine-tuning |
| Matchmaking slow during low traffic | High | High | Reduce timeout to 20 seconds, promote bot play, add quick-match default |
| Cheating via client manipulation | Medium | Low | Server-authoritative game state, input validation |
| Docker container crashes | High | Low | Auto-restart policy, health checks, monitoring alerts |
| Database corruption | Medium | Low | Daily backups, transaction logging, SQLite write-ahead logging |
| Scalability limits | Low | Low | Plan for horizontal scaling with Redis/load balancer if needed |
| Physics inconsistencies | Medium | Medium | Thorough testing, deterministic calculations, unit tests |

---

## 12. Future Enhancements (Post-MVP)

### Phase 6+ Roadmap
1. **Mobile Support**: Responsive design for tablets and mobile devices
2. **Player Accounts**: Optional authentication for persistent profiles
3. **Ranked Matchmaking**: ELO rating system and leaderboards
4. **Team Modes**: 2v2 gameplay with multiple tanks per team
5. **Custom Lobbies**: Private games with room codes
6. **Tournaments**: Bracket-style competition system
7. **Cosmetics**: Tank skins, terrain themes, customization options
8. **Achievements**: Badge system for milestones
9. **Spectator Mode**: Watch live games
10. **Advanced Weapons**: Laser-guided missiles, nukes, shields
11. **Dynamic Weather**: Rain affects wind, fog reduces visibility
12. **Map Editor**: Community-created terrain designs
13. **Replay System**: Watch recorded matches
14. **Voice Chat**: Real-time audio communication

---

## 13. Appendices

### Appendix A: Glossary

- **Scorched Earth**: Classic DOS artillery game from 1991
- **Bun**: Fast JavaScript runtime and toolkit
- **Elysia.js**: Lightweight web framework optimized for Bun
- **WebSocket**: Protocol for full-duplex communication over TCP
- **Perlin Noise**: Gradient noise algorithm for natural-looking terrain
- **WSS**: WebSocket Secure (encrypted WebSocket protocol)
- **Canvas**: HTML5 element for programmatic graphics rendering
- **Turn-based**: Game style where players alternate actions
- **Projectile Motion**: Physics of objects in flight under gravity
- **Splash Damage**: Area-of-effect damage around explosion point

### Appendix B: References

- Bun Documentation: https://bun.sh/docs
- WebSocket Protocol (RFC 6455): https://tools.ietf.org/html/rfc6455
- Elysia.js Guide: https://elysiajs.com/
- HTML5 Canvas Tutorial: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
- Perlin Noise Algorithm: https://en.wikipedia.org/wiki/Perlin_noise
- Original Scorched Earth: https://www.seasip.info/Unix/PSS/scorch.html

### Appendix C: Contact & Support

- **Project Lead**: August Startz
- **Repository**: (TBD - Git URL)
- **Deployment**: scorchedearth.auguststartz.com
- **Server**: Hostinger VPS (auguststartz.com infrastructure)

---

**Document End**

*This PRD is a living document and will be updated as requirements evolve during development.*
