import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RoleCardProps {
  isLiar: boolean;
  secretWord?: string;
}

export function RoleCard({ isLiar, secretWord }: RoleCardProps) {
  const [isRevealed, setIsRevealed] = useState(false);

  return (
    <div className="perspective-1000 w-full max-w-sm mx-auto h-[400px]">
      <motion.div
        className="relative w-full h-full preserve-3d cursor-pointer"
        animate={{ rotateY: isRevealed ? 180 : 0 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
        onClick={() => setIsRevealed(!isRevealed)}
      >
        {/* Front of Card */}
        <div className="absolute inset-0 backface-hidden">
          <div className="w-full h-full rounded-3xl bg-gradient-to-br from-primary to-purple-600 shadow-2xl flex flex-col items-center justify-center p-8 border-4 border-white/20">
            <Eye className="w-16 h-16 text-white mb-6 animate-pulse" />
            <h3 className="text-3xl font-bold text-white text-center mb-2">Tap to Reveal</h3>
            <p className="text-white/80 text-center text-lg">Your secret role is inside...</p>
          </div>
        </div>

        {/* Back of Card */}
        <div className="absolute inset-0 backface-hidden [transform:rotateY(180deg)]">
          <div className={`w-full h-full rounded-3xl shadow-2xl flex flex-col items-center justify-center p-8 border-4 transition-all duration-300 ${
            !isRevealed 
              ? 'bg-white/90 backdrop-blur-xl border-white' 
              : isLiar 
                ? 'bg-gradient-to-br from-red-500 to-orange-500 border-red-200' 
                : 'bg-gradient-to-br from-blue-500 to-cyan-500 border-blue-200'
          }`}>
            {!isRevealed ? (
              <div className="flex flex-col items-center justify-center space-y-4">
                <EyeOff className="w-16 h-16 text-primary/20" />
                <p className="text-primary/40 font-bold">Card Hidden</p>
              </div>
            ) : isLiar ? (
              <>
                <div className="text-6xl mb-6">😈</div>
                <h2 className="text-4xl font-black text-white mb-2 uppercase tracking-wider">You are the Liar!</h2>
                <p className="text-white font-medium text-center text-lg mt-4 bg-black/20 p-4 rounded-xl">
                  Blend in. Don't let them know you don't know the word.
                </p>
              </>
            ) : (
              <>
                <div className="text-6xl mb-6">🕵️</div>
                <h2 className="text-2xl font-bold text-white mb-2">The Secret Word is:</h2>
                <div className="bg-white text-black px-8 py-4 rounded-2xl shadow-lg transform -rotate-2 mt-4">
                  <span className="text-4xl font-black">{secretWord}</span>
                </div>
                <p className="text-white/90 font-medium text-center text-sm mt-8">
                  Describe it carefully. Find the Liar.
                </p>
              </>
            )}
            
            <div className="mt-auto flex items-center gap-2 text-white/60 text-sm">
              <EyeOff className="w-4 h-4" />
              <span>Tap to hide</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
