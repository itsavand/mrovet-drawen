import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, Crown, HelpCircle } from "lucide-react";
import type { Player } from "@shared/schema";
import { cn } from "@/lib/utils";

interface PlayerListProps {
  players: Player[];
  showVotes?: boolean;
  onVote?: (playerId: number) => void;
  myPlayerId?: number;
  phase: string;
}

export function PlayerList({ players, showVotes = false, onVote, myPlayerId, phase }: PlayerListProps) {
  // Generate a deterministic color for avatars
  const getAvatarColor = (name: string) => {
    const colors = ['bg-red-100 text-red-600', 'bg-blue-100 text-blue-600', 'bg-green-100 text-green-600', 'bg-yellow-100 text-yellow-600', 'bg-purple-100 text-purple-600', 'bg-pink-100 text-pink-600'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const hasVoted = (player: Player) => player.hasVoted;
  const canVote = phase === 'voting' && !players.find(p => p.id === myPlayerId)?.hasVoted;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full">
      {players.map((player, idx) => (
        <motion.div
          key={player.id}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: idx * 0.1 }}
          onClick={() => {
            if (canVote && onVote && player.id !== myPlayerId) {
              onVote(player.id);
            }
          }}
          className={cn(
            "relative p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-3 bg-white shadow-sm transition-all",
            canVote && player.id !== myPlayerId 
              ? "cursor-pointer hover:border-primary hover:shadow-md hover:-translate-y-1 active:scale-95" 
              : "border-transparent",
            player.id === myPlayerId && "border-primary/20 bg-primary/5 ring-2 ring-primary/10"
          )}
        >
          {player.id === myPlayerId && (
            <div className="absolute top-2 right-2 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              You
            </div>
          )}
          
          <Avatar className="w-16 h-16 border-4 border-white shadow-lg">
            <AvatarFallback className={cn("text-xl font-bold", getAvatarColor(player.name))}>
              {player.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="text-center">
            <p className="font-bold text-gray-800 truncate max-w-[120px]">{player.name}</p>
            <p className="text-xs text-gray-500 font-semibold">{player.score} pts</p>
          </div>

          {phase === 'voting' && hasVoted(player) && (
            <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-1 shadow-md animate-bounce">
              <Check className="w-4 h-4" />
            </div>
          )}
          
          {phase === 'waiting' && idx === 0 && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold shadow-sm flex items-center gap-1">
              <Crown className="w-3 h-3" /> Host
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
