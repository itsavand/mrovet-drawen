import { db } from "./db";
import { rooms, players, type Room, type Player, type CreateRoomRequest } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { randomBytes } from "crypto";

export interface IStorage {
  createRoom(hostName: string): Promise<{ room: Room; player: Player; sessionId: string }>;
  joinRoom(code: string, playerName: string): Promise<{ room: Room; player: Player; sessionId: string }>;
  getRoom(code: string): Promise<Room | undefined>;
  getRoomPlayers(roomId: number): Promise<Player[]>;
  getPlayer(sessionId: string): Promise<Player | undefined>;
  
  // Game Logic Methods
  updateRoomStatus(roomId: number, status: Room["status"], phaseEndTime?: Date): Promise<void>;
  assignRoles(roomId: number, secretWord: string, liarId: number): Promise<void>;
  submitVote(playerId: number): Promise<void>;
  resetRoom(roomId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async createRoom(hostName: string) {
    // Generate 4 letter code
    let code = "";
    do {
      code = randomBytes(2).toString("hex").toUpperCase();
    } while (await this.getRoom(code));

    const sessionId = randomBytes(16).toString("hex");

    const [room] = await db.insert(rooms).values({
      code,
      hostId: sessionId,
      status: "waiting",
    }).returning();

    const [player] = await db.insert(players).values({
      roomId: room.id,
      sessionId,
      name: hostName,
    }).returning();

    return { room, player, sessionId };
  }

  async joinRoom(code: string, playerName: string) {
    const room = await this.getRoom(code);
    if (!room) throw new Error("Room not found");
    if (room.status !== "waiting") throw new Error("Game already started");

    const sessionId = randomBytes(16).toString("hex");

    const [player] = await db.insert(players).values({
      roomId: room.id,
      sessionId,
      name: playerName,
    }).returning();

    return { room, player, sessionId };
  }

  async getRoom(code: string) {
    const [room] = await db.select().from(rooms).where(eq(rooms.code, code));
    return room;
  }

  async getRoomPlayers(roomId: number) {
    return db.select().from(players).where(eq(players.roomId, roomId));
  }

  async getPlayer(sessionId: string) {
    const [player] = await db.select().from(players).where(eq(players.sessionId, sessionId));
    return player;
  }

  async updateRoomStatus(roomId: number, status: Room["status"], phaseEndTime?: Date) {
    await db.update(rooms)
      .set({ status, phaseEndTime })
      .where(eq(rooms.id, roomId));
  }

  async assignRoles(roomId: number, secretWord: string, liarId: number) {
    await db.update(rooms)
      .set({ secretWord, liarId })
      .where(eq(rooms.id, roomId));
      
    // Reset votes
    await db.update(players)
      .set({ isLiar: false, hasVoted: false })
      .where(eq(players.roomId, roomId));

    // Set liar
    await db.update(players)
      .set({ isLiar: true })
      .where(and(eq(players.roomId, roomId), eq(players.id, liarId)));
  }

  async submitVote(playerId: number) {
    await db.update(players)
      .set({ hasVoted: true })
      .where(eq(players.id, playerId));
  }

  async resetRoom(roomId: number) {
    await db.update(rooms)
      .set({ status: "waiting", secretWord: null, liarId: null, phaseEndTime: null })
      .where(eq(rooms.id, roomId));
    
    await db.update(players)
      .set({ isLiar: false, hasVoted: false })
      .where(eq(players.roomId, roomId));
  }
}

export const storage = new DatabaseStorage();
