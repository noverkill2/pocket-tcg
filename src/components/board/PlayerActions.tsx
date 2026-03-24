import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';

interface PlayerActionsProps {
  playerId: number;
}

export function PlayerActions({ playerId }: PlayerActionsProps) {
  const [coinResult, setCoinResult] = useState<string | null>(null);
  const [diceResult, setDiceResult] = useState<number | null>(null);
  const flipCoin = useGameStore(s => s.flipCoin);
  const rollDice = useGameStore(s => s.rollDice);
  const undo = useGameStore(s => s.undo);
  const endTurn = useGameStore(s => s.endTurn);
  const shuffleDeck = useGameStore(s => s.shuffleDeck);
  const currentTurn = useGameStore(s => s.currentTurn);
  const historyLen = useGameStore(s => s.history.length);
  const [shuffled, setShuffled] = useState(false);

  const isMyTurn = currentTurn === playerId;

  const handleCoin = () => {
    const result = flipCoin();
    setCoinResult(result === 'heads' ? 'Cara' : 'Coroa');
    setTimeout(() => setCoinResult(null), 2000);
  };

  const handleDice = () => {
    const result = rollDice();
    setDiceResult(result);
    setTimeout(() => setDiceResult(null), 2000);
  };

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-1.5 lg:gap-3">
      {/* Moeda */}
      <button
        onClick={handleCoin}
        className="relative flex h-6 items-center gap-0.5 rounded-md bg-accent-gold/20 px-1.5 text-[9px] font-bold text-accent-gold active:scale-90 sm:h-7 sm:px-2 sm:text-[10px] lg:h-8 lg:px-3 lg:text-sm"
        title="Jogar Moeda"
      >
        Moeda
        <AnimatePresence>
          {coinResult && (
            <motion.span
              initial={{ scale: 0, y: 0 }}
              animate={{ scale: 1, y: -20 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute -top-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-accent-gold px-1.5 py-0.5 text-[9px] font-bold text-bg-primary shadow-lg"
            >
              {coinResult}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Dado */}
      <button
        onClick={handleDice}
        className="relative flex h-6 items-center gap-0.5 rounded-md bg-accent-blue/20 px-1.5 text-[9px] font-bold text-accent-blue active:scale-90 sm:h-7 sm:px-2 sm:text-[10px] lg:h-8 lg:px-3 lg:text-sm"
        title="Rolar Dado"
      >
        Dado
        <AnimatePresence>
          {diceResult && (
            <motion.span
              initial={{ scale: 0, y: 0 }}
              animate={{ scale: 1, y: -20 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute -top-1 left-1/2 -translate-x-1/2 rounded bg-accent-blue px-1.5 py-0.5 text-[9px] font-bold text-white shadow-lg"
            >
              {diceResult}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Desfazer */}
      <button
        onClick={undo}
        disabled={!isMyTurn || historyLen === 0}
        className={`flex h-6 items-center rounded-md px-1.5 text-[9px] font-bold active:scale-90 sm:h-7 sm:px-2 sm:text-[10px] lg:h-8 lg:px-3 lg:text-sm ${
          isMyTurn && historyLen > 0
            ? 'bg-accent-red/20 text-accent-red'
            : 'bg-bg-section/30 text-text-secondary/40'
        }`}
        title="Desfazer (Ctrl+Z)"
      >
        Voltar
      </button>

      {/* Embaralhar */}
      <button
        onClick={() => {
          shuffleDeck(playerId);
          setShuffled(true);
          setTimeout(() => setShuffled(false), 1500);
        }}
        className="relative flex h-6 items-center gap-0.5 rounded-md bg-accent-blue/10 px-1.5 text-[9px] font-bold text-accent-blue/70 active:scale-90 sm:h-7 sm:px-2 sm:text-[10px] lg:h-8 lg:px-3 lg:text-sm"
        title="Embaralhar Deck"
      >
        Embaralhar
        <AnimatePresence>
          {shuffled && (
            <motion.span
              initial={{ scale: 0, y: 0 }}
              animate={{ scale: 1, y: -20 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute -top-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-accent-blue px-1.5 py-0.5 text-[9px] font-bold text-white shadow-lg"
            >
              Embaralhado!
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Passar Vez */}
      <button
        onClick={endTurn}
        disabled={!isMyTurn}
        className={`flex h-6 items-center rounded-md px-2 text-[9px] font-bold active:scale-95 sm:h-7 sm:px-3 sm:text-[10px] lg:h-8 lg:px-4 lg:text-sm ${
          isMyTurn
            ? 'bg-accent-green/20 text-accent-green'
            : 'bg-bg-section/30 text-text-secondary/40'
        }`}
      >
        Passar Vez
      </button>
    </div>
  );
}
