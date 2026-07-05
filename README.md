# Detective AI - Production-Ready Detective Game

A premium-quality, AI-powered detective mystery game with procedural case generation, NPC memory systems, and a cinematic dark UI with glassmorphism effects.

## 🎮 Features

### Core Gameplay
- **AI-Generated Cases**: Every case is unique and procedurally generated using OpenAI + procedural fallback engine
- **Multiple Endings**: Player decisions lead to different outcomes
- **NPC Memory System**: NPCs remember conversations, lies, threats, and accusations using Cognee
- **Natural Language Interrogation**: Talk to suspects and witnesses naturally
- **Dynamic Clue Generation**: Clues adapt to player progress
- **Case Similarity Check**: New cases are compared to previous ones and regenerated if too similar (>20%)

### Game Systems
- **Crime Board**: Visualize connections between clues, suspects, and evidence
- **Evidence Inventory**: Collect and analyze physical and digital evidence
- **Case Notebook**: Take notes and tag discoveries
- **Timeline Reconstruction**: Build the sequence of events
- **Interactive Map**: Explore crime scenes
- **Mini-Tools**: Fingerprint and document analysis

### Player Progression
- **Statistics Tracking**: Cases solved, accuracy, play time, XP
- **Reputation System**: Build standing with organizations
- **Achievement System**: Unlock badges and titles
- **Difficulty Levels**: Easy, Medium, Hard, Expert
- **Save/Load**: Manual and auto-save functionality
- **Persistent Detective Profiles**: Each detective has their own unique identity, progress, and isolated Cognee brain!

## 🏗️ Architecture

### Backend (Node.js + Express + TypeScript)
- **RESTful API**: Clean, modular API structure
- **TypeScript**: Full type safety
- **Cognee Integration**: Isolated long-term memory for each detective (one brain per detective)
- **OpenAI Integration**: Case generation and dialogue
- **SQLite Database**: Persistent storage for players, cases, and memories
- **Security**: Helmet, CORS, rate limiting

### Frontend (React + Vite + TypeScript)
- **Modern UI**: Dark cinematic theme with glassmorphism
- **Framer Motion**: Smooth animations
- **Zustand**: State management
- **Tailwind CSS**: Utility-first styling
- **Responsive Design**: Works on all devices

## 📁 Project Structure

```
detective-ai/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── cognee.ts          # Isolated brain management
│   │   │   ├── database.ts        # SQLite initialization
│   │   │   ├── logger.ts
│   │   │   └── openai.ts          # AI client with fallback case generation
│   │   ├── controllers/
│   │   │   ├── caseController.ts
│   │   │   ├── gameController.ts
│   │   │   ├── memoryController.ts
│   │   │   └── playerController.ts
│   │   ├── middleware/
│   │   │   └── validation.ts
│   │   ├── routes/
│   │   │   ├── caseRoutes.ts
│   │   │   ├── gameRoutes.ts
│   │   │   ├── memoryRoutes.ts
│   │   │   └── playerRoutes.ts
│   │   ├── services/
│   │   │   ├── caseService.ts     # Case generation and management
│   │   │   ├── caseSimilarityService.ts
│   │   │   ├── databaseService.ts # Database operations
│   │   │   ├── gameService.ts
│   │   │   ├── interrogationService.ts
│   │   │   ├── investigationService.ts
│   │   │   ├── memoryService.ts
│   │   │   ├── playerService.ts   # Player and profile management
│   │   │   └── proceduralCaseEngine.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   └── statistics.ts
│   │   └── server.ts
│   ├── data/                      # SQLite database files
│   ├── logs/
│   ├── .env
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   ├── test-cognee.ts
│   ├── test-db.ts
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AccusationPanel.tsx
│   │   │   ├── CinematicBackground.tsx
│   │   │   ├── CrimeBoard.tsx
│   │   │   ├── InvestigationHints.tsx
│   │   │   ├── LoadingScreen.tsx
│   │   │   └── ParticleSystem.tsx
│   │   ├── lib/
│   │   │   ├── api.ts              # API client with Vite proxy
│   │   │   ├── statistics.ts
│   │   │   ├── store.ts            # Zustand state management
│   │   │   └── utils.ts
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── GameInterface.tsx
│   │   │   ├── HomePage.tsx        # Profile selection and login
│   │   │   ├── MemoryDashboard.tsx
│   │   │   └── Settings.tsx
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── .env
│   ├── .gitignore
│   ├── Dockerfile
│   ├── index.html
│   ├── nginx.conf
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   └── vite.config.ts
├── .dockerignore
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## �📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- OpenAI API key (optional, uses procedural fallback if not available)
- Cognee API key (optional, uses local memory cache if not available)

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your API keys (if needed)
npm run dev
```

Backend runs on `http://localhost:5000`

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173` (or next available port if in use)

## 🔧 Environment Variables

### Backend (.env)
```
PORT=5000
NODE_ENV=development
OPENAI_API_KEY=your_openai_api_key
COGNEE_API_KEY=your_cognee_api_key
COGNEE_PROJECT_ID=your_cognee_project_id
FRONTEND_URL=http://localhost:5173
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000
```

## 🎯 API Endpoints

### Players
- `GET /api/player` - List all detective profiles
- `POST /api/player` - Create a new detective
- `POST /api/player/login` - Login or create a detective
- `GET /api/player/:id` - Get detective profile
- `PATCH /api/player/:id` - Update detective
- `DELETE /api/player/:id` - Delete detective and all their data
- `GET /api/player/:id/achievements` - Get achievements
- `POST /api/player/:id/achievements` - Unlock achievement
- `PATCH /api/player/:id/reputation` - Update reputation
- `GET /api/player/:id/memory-graph` - Get memory visualization
- `POST /api/player/:id/save` - Save progress
- `GET /api/player/:id/load` - Load progress

### Cases
- `POST /api/cases/generate` - Generate a new case
- `GET /api/cases/:id` - Get case details
- `GET /api/cases/player/:playerId` - Get detective's cases
- `PATCH /api/cases/:id/status` - Update case status
- `POST /api/cases/:id/solve` - Submit solution
- `GET /api/cases/:id/hint` - Get hint

### Memory
- `POST /api/memory/remember` - Store memory (scoped to detective's brain)
- `POST /api/memory/recall` - Retrieve memories (scoped to detective's brain)
- `PUT /api/memory/memify/:id` - Update memory
- `DELETE /api/memory/forget/:id` - Delete memory
- `GET /api/memory/related/:id` - Get related memories

### Game
- `POST /api/game/start` - Start new game
- `GET /api/game/state/:gameId` - Get game state
- `PATCH /api/game/state/:gameId` - Update game state
- `POST /api/game/:gameId/clues` - Discover clue
- `POST /api/game/:gameId/evidence` - Collect evidence
- `POST /api/game/:gameId/interview` - Interview NPC
- `POST /api/game/:gameId/notes` - Add note
- `POST /api/game/:gameId/connections` - Add connection
- `POST /api/game/:gameId/analyze` - Analyze evidence
- `POST /api/game/:gameId/auto-save` - Auto-save
- `GET /api/game/load/:saveId` - Load game
- `DELETE /api/game/:gameId` - Delete game

## 🎨 UI Components

### Glassmorphism System
- `.glass` - Basic glass effect
- `.glass-dark` - Darker glass effect
- `.glass-card` - Card with glass effect
- `.glass-button` - Button with glass effect
- `.glass-input` - Input with glass effect

### Animations
- `animate-fade-in` - Fade in
- `animate-slide-up` - Slide up
- `animate-slide-down` - Slide down
- `animate-slide-left` - Slide left
- `animate-slide-right` - Slide right
- `animate-pulse-slow` - Slow pulse
- `animate-glow` - Glow effect

### Colors
- `background` - #0a0a0f
- `surface` - #12121a
- `primary` - #6366f1
- `accent` - #8b5cf6
- `success` - #10b981
- `warning` - #f59e0b
- `danger` - #ef4444

## 🚀 Deployment

### Backend
```bash
cd backend
npm run build
npm start
```

### Frontend
```bash
cd frontend
npm run build
# Deploy dist/ folder to your hosting service
```

## 📝 Development

### Backend Scripts
- `npm run dev` - Development mode with hot reload
- `npm run build` - Build TypeScript
- `npm start` - Production mode
- `npm run lint` - Run ESLint

### Frontend Scripts
- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## 🧪 Testing

The application includes comprehensive error handling and loading states. All features are fully functional with no placeholder code.

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Please follow the existing code style and architecture patterns.

## 🎯 Future Enhancements

- Multiplayer investigations
- Voice recognition for interrogation
- VR support for crime scene exploration
- Mobile app version
- Additional crime types
- More sophisticated AI dialogue
- Enhanced visual effects