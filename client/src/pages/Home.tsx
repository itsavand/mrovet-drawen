import { useState } from "react";
import { useGame } from "@/hooks/use-game";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GameCard } from "@/components/GameCard";
import { motion } from "framer-motion";
import { Loader2, Users, Play, Ghost } from "lucide-react";

export default function Home() {
  const { createRoom, joinRoom } = useGame();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const handleCreate = () => {
    if (!name.trim()) return;
    createRoom.mutate(name);
  };

  const handleJoin = () => {
    if (!name.trim() || code.length !== 4) return;
    joinRoom.mutate({ code: code.toUpperCase(), name });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center space-y-2"
        >
          <div className="inline-block p-4 rounded-full bg-white shadow-xl mb-4 rotate-3 animate-float">
            <Ghost className="w-16 h-16 text-primary" />
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-primary tracking-tight">
            LIAR<span className="text-accent">.io</span>
          </h1>
          <p className="text-lg text-muted-foreground font-medium">
            Bluff, deceive, and survive the vote!
          </p>
        </motion.div>

        <GameCard className="backdrop-blur-sm bg-white/90">
          <Tabs defaultValue="join" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 p-1 bg-muted/50 rounded-xl">
              <TabsTrigger value="join" className="rounded-lg font-bold">Join Room</TabsTrigger>
              <TabsTrigger value="create" className="rounded-lg font-bold">Create Room</TabsTrigger>
            </TabsList>

            <TabsContent value="join" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-muted-foreground ml-1">YOUR NAME</label>
                  <Input 
                    placeholder="Enter your nickname..." 
                    className="h-14 text-lg bg-gray-50 border-2 focus:border-primary/50 rounded-xl"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-muted-foreground ml-1">ROOM CODE</label>
                  <Input 
                    placeholder="ABCD" 
                    className="h-14 text-lg bg-gray-50 border-2 focus:border-primary/50 rounded-xl uppercase tracking-[0.2em] font-mono text-center"
                    maxLength={4}
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                  />
                </div>
                <Button 
                  size="lg" 
                  className="w-full h-14 text-xl font-bold rounded-xl shadow-lg shadow-primary/25 mt-4 btn-bounce"
                  onClick={handleJoin}
                  disabled={joinRoom.isPending || !name || code.length !== 4}
                >
                  {joinRoom.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : "Join Game"}
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="create" className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground ml-1">YOUR NAME</label>
                <Input 
                  placeholder="Enter your nickname..." 
                  className="h-14 text-lg bg-gray-50 border-2 focus:border-primary/50 rounded-xl"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 flex gap-3 items-start">
                <div className="bg-yellow-100 p-2 rounded-lg">
                  <Users className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <h4 className="font-bold text-yellow-800">Host a Game</h4>
                  <p className="text-sm text-yellow-700 leading-tight mt-1">
                    You'll get a room code to share with friends. Needs 3+ players.
                  </p>
                </div>
              </div>
              <Button 
                size="lg" 
                className="w-full h-14 text-xl font-bold rounded-xl shadow-lg shadow-primary/25 bg-secondary hover:bg-secondary/90 text-white mt-4 btn-bounce"
                onClick={handleCreate}
                disabled={createRoom.isPending || !name}
              >
                {createRoom.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : "Create Room"}
              </Button>
            </TabsContent>
          </Tabs>
        </GameCard>
      </div>
    </div>
  );
}
