import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';

export function DiceRoll() {
  const [result, setResult] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);
  const roll = useGameStore(s => s.rollDice);

  const handleRoll = () => {
    if (rolling) return;
    setRolling(true);
    setResult(null);

    setTimeout(() => {
      setResult(roll());
      setRolling(false);
    }, 500);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleRoll}
        disabled={rolling}
        className="rounded-lg bg-accent-blue px-4 py-2 text-sm font-bold text-white transition-transform hover:scale-105 disabled:opacity-50"
      >
        Rolar Dado
      </button>
      <AnimatePresence>
        {(rolling || result) && (
          <motion.div
            initial={{ rotate: 0, scale: 0 }}
            animate={{ rotate: rolling ? 360 : 0, scale: 1 }}
            exit={{ scale: 0 }}
            className="flex h-12 w-12 items-center justify-center rounded-lg bg-white text-2xl font-bold text-bg-primary shadow-lg"
          >
            {rolling ? '?' : result}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
