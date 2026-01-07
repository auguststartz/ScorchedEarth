# Scorched Earth - Multiplayer Web Game

A browser-based multiplayer artillery game , featuring turn-based tank combat, realistic physics, and AI opponents.

## Features

- **Multiplayer Matchmaking**: Automated queue system pairing human players
- **AI Opponents**: Three difficulty levels (Easy, Medium, Hard)
- **Real-time Gameplay**: WebSocket-based communication for instant updates
- **Procedural Terrain**: Perlin noise-generated destructible landscapes
- **Physics Engine**: Realistic projectile motion with wind effects
- **Multiple Weapons**: Standard shell, heavy missile, cluster bomb, MIRV, and digger
- **Canvas Rendering**: Smooth 60 FPS gameplay

## Tech Stack

- **Runtime**: Bun v1.0+
- **Framework**: Elysia.js
- **Frontend**: HTML5 Canvas, Vanilla TypeScript
- **Real-time**: WebSockets (native Bun support)
- **Deployment**: Docker

## Quick Start

### Development

```bash
# Install dependencies
bun install

# Run development server
bun run dev

# Server will start at http://localhost:3000
```

### Production (Docker)

```bash
# Build and start container
docker-compose build
docker-compose up -d

# View logs
docker logs scorched-earth-game --tail 50

# Stop container
docker-compose down
```

## Project Structure

```
scorched-earth/
├── src/
│   ├── server.ts              # Main Bun server
│   ├── websocket/
│   │   ├── handler.ts         # WebSocket connection handling
│   │   └── messages.ts        # Message type definitions
│   ├── game/
│   │   ├── engine.ts          # Core game loop
│   │   ├── physics.ts         # Projectile physics
│   │   ├── terrain.ts         # Terrain generation
│   │   ├── weapons.ts         # Weapon system
│   │   └── state.ts           # Game state management
│   ├── ai/
│   │   ├── base.ts            # Base AI class
│   │   ├── easy.ts            # Easy AI
│   │   ├── medium.ts          # Medium AI
│   │   ├── hard.ts            # Hard AI
│   │   └── manager.ts         # AI manager
│   ├── matchmaking/
│   │   └── queue.ts           # Player queue management
│   └── utils/
│       ├── logger.ts          # Logging utility
│       └── validator.ts       # Input validation
├── public/
│   ├── index.html             # Lobby page
│   ├── game.html              # Game page
│   ├── css/
│   │   ├── main.css           # Global styles
│   │   └── game.css           # Game-specific styles
│   └── js/
│       ├── lobby.js           # Lobby client
│       ├── game.js            # Game client
│       ├── renderer.js        # Canvas rendering
│       └── websocket.js       # WebSocket client
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## Game Controls

### Lobby
- Enter your player name (3-16 characters)
- Click "Find Match" to search for opponents
- Click "Play vs Computer" for immediate AI match

### In-Game
- **Angle**: Adjust with slider or keyboard arrows (↑/↓)
- **Power**: Adjust with slider or keyboard arrows (←/→)
- **Fire**: Click button or press Space/Enter
- **Chat**: Type messages to communicate with opponents

### Weapons
1. **Standard Shell**: Basic projectile (5 shots)
2. **Heavy Missile**: High damage, slower (3 shots)
3. **Cluster Bomb**: Splits into 5 bomblets (3 shots)
4. **MIRV**: 3 independent projectiles (3 shots)
5. **Digger**: Burrows through terrain (3 shots)

## AI Difficulty Levels

### Easy
- 40% accuracy
- Ignores wind completely
- Uses only standard shells
- 10% chance of shooting wrong direction

### Medium
- 65% accuracy
- Ignores wind 30% of the time
- Uses appropriate weapons for distance
- 2-second thinking delay

### Hard
- 85% accuracy
- Always accounts for wind
- Advanced trajectory calculation
- Intelligent weapon selection
- 1-second thinking delay

## Game Mechanics

- **Turn Duration**: 45 seconds per turn
- **Max Turns**: 50 turns per game
- **Starting HP**: 100 per player
- **Wind Range**: -20 to +20 units
- **Gravity**: 9.8 m/s²
- **Damage**: 15-50 based on weapon and impact

## Deployment

### Hostinger VPS Setup

1. **Clone Repository**
   ```bash
   cd /var/www
   git clone <repository-url> scorched-earth
   cd scorched-earth
   ```

2. **Build Docker Image**
   ```bash
   docker-compose build
   ```

3. **Configure Nginx**
   ```bash
   sudo nano /etc/nginx/sites-available/scorchedearth
   ```

   Add the nginx configuration from the PRD.

4. **Enable Site**
   ```bash
   sudo ln -s /etc/nginx/sites-available/scorchedearth /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

5. **Start Application**
   ```bash
   docker-compose up -d
   ```

### Health Monitoring

```bash
# Check application health
curl http://localhost:3000/health

# View logs
docker logs scorched-earth-game --tail 100 -f

# Check active games
curl http://localhost:3000/health | jq '.activeGames'
```

## API Endpoints

- `GET /` - Lobby page
- `GET /game` - Game page
- `GET /health` - Health check endpoint
- `WS /ws` - WebSocket connection

## WebSocket Messages

### Client → Server
- `PLAYER_CONNECT` - Initial connection
- `PLAYER_ACTION` - Fire weapon
- `CHAT_MESSAGE` - Send chat message

### Server → Client
- `MATCHMAKING_STATUS` - Queue updates
- `GAME_START` - Game initialization
- `GAME_STATE` - State synchronization
- `PROJECTILE_UPDATE` - Projectile position
- `EXPLOSION_EVENT` - Impact notification
- `TURN_END` - Turn completion
- `GAME_OVER` - Match results

## Development

### Running Tests
```bash
bun test
```

### Type Checking
```bash
bun run tsc --noEmit
```

### Linting
```bash
# Add linting configuration as needed
```

## Performance Targets

- Game rendering: 60 FPS
- WebSocket latency: < 100ms
- Matchmaking: < 45 seconds
- Turn processing: < 500ms
- Page load: < 3 seconds

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

MIT

## Author

August Startz

---

**Built with Bun** 🚀
