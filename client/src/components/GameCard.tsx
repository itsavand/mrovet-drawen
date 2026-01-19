import { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GameCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  title?: string;
}

export function GameCard({ children, className, delay = 0, title }: GameCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className={cn(
        "bg-white dark:bg-card border-4 border-black/5 dark:border-white/10 rounded-3xl shadow-xl overflow-hidden relative",
        className
      )}
    >
      {title && (
        <div className="bg-muted/50 px-6 py-4 border-b border-black/5 dark:border-white/5">
          <h2 className="text-xl font-bold text-center text-primary">{title}</h2>
        </div>
      )}
      <div className="p-6 md:p-8">
        {children}
      </div>
    </motion.div>
  );
}
