import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';

export function CoinFlip() {
  const [result, setResult] = useState<'heads' | 'tails' | null>(null);
  const [flipping, setFlipping] = useState(false);
  const flip = useGameStore(s => s.flipCoin);

  const handleFlip = () => {
    if (flipping) return;
    setFlipping(true);
    setResult(null);

    setTimeout(() => {
      const coinResult = flip();
      setResult(coinResult);
      setFlipping(false);
    }, 600);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleFlip}
        disabled={flipping}
        className="rounded-full bg-accent-gold px-4 py-2 text-sm font-bold text-bg-primary transition-transform hover:scale-105 disabled:opacity-50"
      >
        Jogar Moeda
      </button>
      <AnimatePresence>
        {(flipping || result) && (
          <motion.div
            initial={{ rotateY: 0, scale: 0 }}
            animate={{
              rotateY: flipping ? 720 : 0,
              scale: 1,
            }}
            exit={{ scale: 0 }}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-gold text-lg font-bold text-bg-primary shadow-lg"
          >
            {flipping ? '?' : result === 'heads' ? 'C' : 'K'}
          </motion.div>
        )}
      </AnimatePresence>
      {result && !flipping && (
        <span className="text-sm text-text-secondary">
          {result === 'heads' ? 'Cara!' : 'Coroa!'}
        </span>
      )}
    </div>
  );
}
