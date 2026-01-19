import { z } from 'zod';

export const api = {
  rooms: {
    create: {
      method: 'POST' as const,
      path: '/api/rooms',
      input: z.object({
        name: z.string().min(1, "Name is required"),
      }),
      responses: {
        201: z.object({ code: z.string(), sessionId: z.string(), playerId: z.number() }),
      },
    },
    join: {
      method: 'POST' as const,
      path: '/api/rooms/join',
      input: z.object({
        code: z.string().length(4, "Code must be 4 characters"),
        name: z.string().min(1, "Name is required"),
      }),
      responses: {
        200: z.object({ code: z.string(), sessionId: z.string(), playerId: z.number() }),
        404: z.object({ message: z.string() }),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/rooms/:code',
      responses: {
        200: z.object({ 
          room: z.any(), // Typed in schema.ts
          players: z.array(z.any()) 
        }), 
        404: z.object({ message: z.string() }),
      },
    }
  }
};
