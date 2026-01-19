import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import type { GameState, WsMessage } from "@shared/schema";
import { useLocation } from "wouter";

// WebSocket URL helper
function getWsUrl() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  return `${protocol}//${host}/ws`;
}

export function useGame() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Initialize WebSocket connection
  useEffect(() => {
    const wsUrl = getWsUrl();
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      
      // Attempt to rejoin if we have a session
      const storedSession = localStorage.getItem("party_game_session");
      if (storedSession) {
        try {
          const session = JSON.parse(storedSession);
          if (session.code && session.sessionId) {
            ws.send(JSON.stringify({
              type: 'join',
              sessionId: session.sessionId,
              code: session.code,
              name: session.name || "Anonymous"
            }));
          }
        } catch (e) {
          console.error("Invalid session storage", e);
        }
      }
    };

    ws.onclose = () => {
      setConnected(false);
      // Optional: Add reconnection logic here
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WsMessage;
        
        switch (message.type) {
          case 'state_update':
            setGameState(message.state);
            break;
          case 'error':
            toast({
              variant: "destructive",
              title: "Error",
              description: message.message
            });
            break;
        }
      } catch (err) {
        console.error("Failed to parse WS message", err);
      }
    };

    return () => {
      ws.close();
    };
  }, [toast]);

  // Actions
  const createRoom = useMutation({
    mutationFn: async ({ name, rounds }: { name: string; rounds: number }) => {
      const res = await fetch(api.rooms.create.path, {
        method: api.rooms.create.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, rounds })
      });
      
      if (!res.ok) throw new Error("Failed to create room");
      return await res.json();
    },
    onSuccess: (data) => {
      localStorage.setItem("party_game_session", JSON.stringify(data));
      // Send create message to WS to link connection
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'join',
          sessionId: data.sessionId,
          code: data.code,
          name: data.name || "Anonymous"
        }));
      }
      setLocation(`/room/${data.code}`);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to create room",
        description: error.message
      });
    }
  });

  const joinRoom = useMutation({
    mutationFn: async ({ code, name }: { code: string; name: string }) => {
      const res = await fetch(api.rooms.join.path, {
        method: api.rooms.join.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, name })
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to join room");
      }
      return await res.json();
    },
    onSuccess: (data, variables) => {
      localStorage.setItem("party_game_session", JSON.stringify({ ...data, name: variables.name }));
      // WS join will happen automatically via state sync or explicit join if needed
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'join',
          code: data.code,
          name: variables.name,
          sessionId: data.sessionId
        }));
      }
      setLocation(`/room/${data.code}`);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to join room",
        description: error.message
      });
    }
  });

  const sendAction = useCallback((type: string, payload: any = {}) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type, ...payload }));
    } else {
      toast({
        variant: "destructive",
        title: "Disconnected",
        description: "Reconnecting to server..."
      });
    }
  }, [toast]);

  const startGame = () => sendAction('start_game');
  const votePlayer = (targetId: number) => sendAction('vote', { targetId });
  const playAgain = () => sendAction('play_again');
  const setReady = () => sendAction('ready');

  return {
    gameState,
    connected,
    createRoom,
    joinRoom,
    startGame,
    votePlayer,
    playAgain,
    setReady
  };
}
