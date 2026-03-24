import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';

interface GameLogProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatAction(action: string, details?: string): string {
  const map: Record<string, string> = {
    coin_flip: `Moeda: ${details}`,
    dice_roll: `Dado: ${details}`,
    draw: `Comprou carta`,
    move: `Moveu carta`,
    attach: `Anexou carta`,
    end_turn: `Passou o turno`,
  };
  return map[action] || `${action}${details ? `: ${details}` : ''}`;
}

export function GameLog({ isOpen, onClose }: GameLogProps) {
  const log = useGameStore(s => s.log);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [log.length]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          className="fixed right-0 top-0 z-40 flex h-full w-72 flex-col bg-bg-card shadow-2xl sm:w-80"
        >
          <div className="flex items-center justify-between border-b border-bg-section p-4">
            <h3 className="font-bold text-text-primary">Historico</h3>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-text-secondary hover:bg-bg-section hover:text-text-primary"
            >
              X
            </button>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3">
            {log.length === 0 ? (
              <p className="text-center text-sm text-text-secondary">Nenhuma acao ainda</p>
            ) : (
              <div className="space-y-1.5">
                {log.map((entry, i) => (
                  <div
                    key={i}
                    className="rounded-lg bg-bg-section/50 px-3 py-2 text-xs"
                  >
                    <span className="font-medium text-accent-blue">
                      {entry.playerId === 'system' ? 'Sistema' : entry.playerId}
                    </span>
                    <span className="ml-2 text-text-secondary">
                      {formatAction(entry.action, entry.details)}
                    </span>
                    <span className="ml-2 text-text-secondary/50">
                      {new Date(entry.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
