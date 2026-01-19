import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PhaseTimerProps {
  endTime: string | null;
  totalDuration?: number; // In seconds, used for progress bar
  onExpire?: () => void;
  className?: string;
}

export function PhaseTimer({ endTime, totalDuration = 60, onExpire, className }: PhaseTimerProps) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!endTime) {
      setTimeLeft(0);
      return;
    }

    const interval = setInterval(() => {
      const end = new Date(endTime).getTime();
      const now = new Date().getTime();
      const diff = Math.max(0, Math.ceil((end - now) / 1000));
      
      setTimeLeft(diff);
      
      if (diff === 0) {
        clearInterval(interval);
        onExpire?.();
      }

      if (totalDuration > 0) {
        const p = (diff / totalDuration) * 100;
        setProgress(Math.min(100, Math.max(0, p)));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime, totalDuration, onExpire]);

  if (!endTime) return null;

  return (
    <div className={cn("flex flex-col items-center justify-center w-full max-w-xs mx-auto", className)}>
      <motion.div 
        key={timeLeft}
        initial={{ scale: 0.9, opacity: 0.5 }}
        animate={{ scale: 1, opacity: 1 }}
        className={cn(
          "text-6xl font-black font-mono tracking-tight",
          timeLeft <= 10 ? "text-red-500 animate-pulse" : "text-primary"
        )}
      >
        {timeLeft}
      </motion.div>
      <div className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-2">Seconds Left</div>
      
      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
        <motion.div 
          className={cn(
            "h-full rounded-full transition-all duration-1000 linear",
            timeLeft <= 10 ? "bg-red-500" : "bg-primary"
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
