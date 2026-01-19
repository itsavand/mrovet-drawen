import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

const WORDS = ["Apple", "Beach", "Space", "Pizza", "Guitar", "Ninja", "Robot", "Forest", "Dragon", "Coffee"];

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // REST APIs for room creation/joining (initial handshake)
  app.post(api.rooms.create.path, async (req, res) => {
    try {
      const { name } = api.rooms.create.input.parse(req.body);
      const result = await storage.createRoom(name);
      res.status(201).json({ 
        code: result.room.code, 
        sessionId: result.sessionId, 
        playerId: result.player.id 
      });
    } catch (e) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.post(api.rooms.join.path, async (req, res) => {
    try {
      const { code, name } = api.rooms.join.input.parse(req.body);
      const result = await storage.joinRoom(code.toUpperCase(), name);
      res.status(200).json({ 
        code: result.room.code, 
        sessionId: result.sessionId, 
        playerId: result.player.id 
      });
    } catch (e: any) {
      res.status(404).json({ message: e.message || "Room not found" });
    }
  });

  // WebSocket Setup
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  
  // Map sessionId -> WebSocket
  const clients = new Map<string, WebSocket>();
  // Map sessionId -> roomCode
  const sessions = new Map<string, string>();

  // Helper to broadcast state to a room
  async function broadcastRoomState(roomCode: string) {
    const room = await storage.getRoom(roomCode);
    if (!room) return;
    
    const players = await storage.getRoomPlayers(room.id);
    
    // Construct state
    const baseState = {
      room,
      players: players.map(p => ({ ...p, isLiar: false })), // Hide liar info by default
      timeLeft: room.phaseEndTime ? Math.max(0, Math.ceil((new Date(room.phaseEndTime).getTime() - Date.now()) / 1000)) : 0
    };

    players.forEach(p => {
      const ws = clients.get(p.sessionId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        // Customize state per player (reveal role)
        const playerState = {
          ...baseState,
          me: p,
          players: players.map(other => ({
            ...other,
            isLiar: room.status === 'finished' ? other.isLiar : undefined // Only reveal at end
          })),
          room: {
            ...room,
            secretWord: (p.isLiar && room.status !== 'finished') ? null : room.secretWord // Liar doesn't see word
          }
        };
        ws.send(JSON.stringify({ type: 'state_update', state: playerState }));
      }
    });
  }

  wss.on("connection", (ws) => {
    let currentSessionId: string | null = null;
    let currentRoomCode: string | null = null;

    ws.on("message", async (data) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === 'join') {
          // Handshake with sessionId from REST
          const { sessionId, code } = msg;
          const player = await storage.getPlayer(sessionId);
          
          if (player) {
            currentSessionId = sessionId;
            currentRoomCode = code;
            clients.set(sessionId, ws);
            sessions.set(sessionId, code);
            await broadcastRoomState(code);
          }
        }

        if (msg.type === 'start_game' && currentSessionId && currentRoomCode) {
          const room = await storage.getRoom(currentRoomCode);
          if (room && room.hostId === currentSessionId) {
            const players = await storage.getRoomPlayers(room.id);
            if (players.length < 3) {
               // In prod enforce min players, dev mode allow 1+ for testing
               // ws.send(JSON.stringify({ type: 'error', message: "Need 3+ players" }));
               // return;
            }

            const word = WORDS[Math.floor(Math.random() * WORDS.length)];
            const liarIndex = Math.floor(Math.random() * players.length);
            const liarId = players[liarIndex].id;

            // 5 seconds role reveal + 60 seconds play
            // Actually let's just go straight to "playing" with a timer
            const phaseTime = new Date(Date.now() + 60000); // 60s
            
            await storage.assignRoles(room.id, word, liarId);
            await storage.updateRoomStatus(room.id, "playing", phaseTime);
            await broadcastRoomState(currentRoomCode);

            // Set timeout to switch to voting
            setTimeout(async () => {
              const r = await storage.getRoom(currentRoomCode!);
              if (r && r.status === 'playing') {
                await storage.updateRoomStatus(r.id, "voting");
                await broadcastRoomState(currentRoomCode!);
              }
            }, 60000);
          }
        }

        if (msg.type === 'vote' && currentSessionId && currentRoomCode) {
          const player = await storage.getPlayer(currentSessionId);
          if (player && !player.hasVoted) {
            await storage.submitVote(player.id);
            // Check if all voted
            const room = await storage.getRoom(currentRoomCode);
            const players = await storage.getRoomPlayers(room!.id);
            
            if (players.every(p => p.hasVoted)) {
               await storage.updateRoomStatus(room!.id, "finished");
            }
            await broadcastRoomState(currentRoomCode);
          }
        }
        
        if (msg.type === 'play_again' && currentSessionId && currentRoomCode) {
           const room = await storage.getRoom(currentRoomCode);
           if (room && room.hostId === currentSessionId) {
             await storage.resetRoom(room.id);
             await broadcastRoomState(currentRoomCode);
           }
        }

      } catch (e) {
        console.error("WS Message Error", e);
      }
    });

    ws.on("close", () => {
      if (currentSessionId) {
        clients.delete(currentSessionId);
      }
    });
  });

  return httpServer;
}
