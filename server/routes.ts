import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

const WORDS = [
  "Sێڤ", "مۆز", "ئەژدیها", "فیل", "ئاگری", "گیتار", "خانی", "دوورگە", "دارستان", "کەنگەر",
  "لێمۆن", "چیا", "دەفتەر", "زەریا", "پیانۆ", "شاژن", "ڕۆکێت", "ڕۆژ", "پڵنگ", "سەوانە",
  "کەمانچە", "نەهەنگ", "زەرافە", "یاخت", "زێبڕا", "تەیارە", "پرد", "قەلات", "بیابان", "هەڵۆ",
  "دارستان", "باخچە", "چەکۆچ", "بەفر", "چاکێت", "تەیارۆک", "مارمێلکە", "ئاوێنە", "دەرزی", "کوندەپەپۆ",
  "پیزا", "لێفە", "ڕۆبۆت", "مار", "تەلەفۆن", "یونیکۆرن", "فامپایەر", "پەنجەرە", "ئێکس-ڕەی", "یۆیۆ",
  "سندان", "گسک", "کاکتوس", "دۆلفین", "مەکینە", "نافوورە", "بەستەڵەک", "کڵاڤ", "ئیگلۆ", "جیگساو",
  "کیبۆرد", "فانۆس", "ماگنێت", "بزمار", "واحە", "تەوتی", "تیردان", "سوکان", "زین", "تەلەسکۆپ",
  "یو ئێف ئۆ", "ڤاڵڤ", "سپانە", "زینۆن", "داڤ", "زیپ", "لەنگەر", "بەرمیل", "قیبلەنما", "خەنجەر",
  "کۆلکە", "واشە", "چاویلکە", "چەنگ", "مەرەکەب", "جەوهەر", "کتری", "کەمەند", "پوزەوانە", "تۆڕ",
  "پارۆ", "گۆتە", "پێنوس", "پەت", "بێژینگ", "مەقاش", "باژێڕ", "مەنگەنە", "عەرەبانە", "تەپڵ",
  "کۆل", "تام", "مۆرهەک", "کۆرە", "تەشوێ", "دریل", "سمپارە", "داس", "مەتهەب", "لولا"
];

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // REST APIs for room creation/joining (initial handshake)
  app.post(api.rooms.create.path, async (req, res) => {
    try {
      const { name, rounds } = api.rooms.create.input.parse(req.body);
      const result = await storage.createRoom(name, rounds);
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

  // Helper to start the playing phase
  async function startPlayingPhase(roomId: number, roomCode: string, playersCount: number) {
    const word = WORDS[Math.floor(Math.random() * WORDS.length)];
    const liarIndex = Math.floor(Math.random() * playersCount);
    
    const players = await storage.getRoomPlayers(roomId);
    const liarId = players[liarIndex].id;
    const phaseTime = new Date(Date.now() + 60000);
    
    await storage.assignRoles(roomId, word, liarId);
    await storage.updateRoomStatus(roomId, "playing", phaseTime);
    await broadcastRoomState(roomCode);

    // Set timeout to switch to voting
    setTimeout(async () => {
      const r = await storage.getRoom(roomCode);
      if (r && r.status === 'playing') {
        await storage.updateRoomStatus(r.id, "voting");
        await broadcastRoomState(roomCode);
      }
    }, 60000);
  }

  wss.on("connection", (ws) => {
    let currentSessionId: string | null = null;
    let currentRoomCode: string | null = null;

    ws.on("message", async (data) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === 'join' || msg.type === 'reconnect') {
          // ... existing join logic
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
            await startPlayingPhase(room.id, currentRoomCode, players.length);
          }
        }

        if (msg.type === 'vote' && currentSessionId && currentRoomCode) {
          // ... existing vote logic
          const player = await storage.getPlayer(currentSessionId);
          if (player && !player.hasVoted) {
            await storage.submitVote(player.id);
            const room = await storage.getRoom(currentRoomCode);
            const players = await storage.getRoomPlayers(room!.id);
            
            if (players.every(p => p.hasVoted)) {
               for (const p of players) {
                 if (!p.isLiar) await storage.updateScore(p.id, 3);
               }
               await storage.updateRoomStatus(room!.id, "finished");
            }
            await broadcastRoomState(currentRoomCode);
          }
        }

        if (msg.type === 'ready' && currentSessionId && currentRoomCode) {
          const player = await storage.getPlayer(currentSessionId);
          if (player) {
            await storage.setReady(player.id, true);
            const room = await storage.getRoom(currentRoomCode);
            const players = await storage.getRoomPlayers(room!.id);
            
            if (players.every(p => p.isReady)) {
               if (room!.currentRound < room!.totalRounds) {
                  await storage.updateRoomRound(room!.id, room!.currentRound + 1);
                  await storage.resetPlayersReady(room!.id);
                  await startPlayingPhase(room!.id, currentRoomCode, players.length);
               } else {
                  await storage.updateRoomStatus(room!.id, "finished");
               }
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
