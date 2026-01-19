# Liar.io - Multiplayer Party Game

## Overview

Liar.io is a real-time multiplayer party game where players try to identify the "liar" - the one player who doesn't know the secret word. Built as a full-stack TypeScript application with React frontend and Express backend, using WebSockets for real-time game state synchronization.

The game flow:
1. Host creates a room and shares the 4-letter code
2. Players join the room
3. One player is randomly assigned as the "liar" (doesn't know the secret word)
4. Players discuss and vote to identify the liar
5. Points are awarded based on correct/incorrect votes

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight alternative to React Router)
- **State Management**: TanStack React Query for server state, local React state for UI
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Animations**: Framer Motion for page transitions and game phase animations
- **Build Tool**: Vite with path aliases (@/ for client/src, @shared/ for shared)

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Real-time Communication**: WebSocket (ws library) on /ws path
- **Database ORM**: Drizzle ORM with PostgreSQL
- **API Design**: REST endpoints for room creation/joining, WebSocket for game state sync
- **Session Management**: Session IDs stored in localStorage, mapped server-side to rooms

### Data Flow Pattern
1. REST API handles initial handshake (create room, join room) - returns sessionId and roomCode
2. WebSocket connection established with sessionId for authentication
3. All game state updates broadcast via WebSocket 'state_update' events
4. Client maintains single source of truth via useGame hook

### Database Schema
- **rooms**: id, code (4-char unique), hostId, status (waiting/playing/voting/finished), secretWord, liarId, totalRounds, currentRound, phaseEndTime
- **players**: id, roomId, sessionId, name, isLiar, hasVoted, isReady, score

### Key Design Decisions
- **Mobile-first design**: UI components optimized for touch interaction
- **Session persistence**: localStorage stores session for reconnection handling
- **Shared types**: Schema and route definitions in /shared folder used by both client and server
- **Phase timers**: Server-authoritative timing with client-side countdown display

## External Dependencies

### Database
- **PostgreSQL**: Primary database via DATABASE_URL environment variable
- **Drizzle ORM**: Schema defined in shared/schema.ts, migrations in /migrations

### UI Components
- **shadcn/ui**: Full component library with Radix UI primitives
- **Tailwind CSS**: Utility-first styling with custom theme variables
- **Lucide React**: Icon library

### Real-time & Effects
- **WebSocket (ws)**: Native WebSocket server for game synchronization
- **canvas-confetti**: Celebration effects for game winners
- **Framer Motion**: Animation library for transitions

### Build & Dev
- **Vite**: Frontend build tool with HMR
- **esbuild**: Server bundling for production
- **tsx**: TypeScript execution for development

### Replit-specific
- **@replit/vite-plugin-runtime-error-modal**: Error overlay in development
- **@replit/vite-plugin-cartographer**: Development tooling