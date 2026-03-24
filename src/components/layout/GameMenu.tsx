import { useState, useEffect } from 'react';
import { CoinFlip } from '../ui/CoinFlip';
import { DiceRoll } from '../ui/DiceRoll';
import { useGameStore } from '../../store/gameStore';

export function GameMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const endTurn = useGameStore(s => s.endTurn);
  const undo = useGameStore(s => s.undo);
  const shuffleDeck = useGameStore(s => s.shuffleDeck);
  const currentTurn = useGameStore(s => s.currentTurn);

  // Fechar com Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-10 items-center gap-2 rounded-lg bg-bg-section px-4 text-sm text-text-primary hover:bg-bg-card"
        aria-expanded={isOpen}
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
        Menu
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-12 z-30 w-72 rounded-xl border border-bg-section bg-bg-card p-4 shadow-2xl">
            <div className="space-y-4">
              {/* Ações de jogo */}
              <div className="space-y-2">
                <button
                  onClick={() => { endTurn(); setIsOpen(false); }}
                  className="w-full rounded-lg bg-accent-green px-3 py-3 text-sm font-bold text-bg-primary active:scale-95"
                >
                  Passar Turno
                  <span className="ml-2 text-xs opacity-70">(Space)</span>
                </button>
                <button
                  onClick={undo}
                  className="w-full rounded-lg bg-bg-section px-3 py-2.5 text-sm text-text-primary hover:bg-bg-primary active:scale-95"
                >
                  Desfazer
                  <span className="ml-2 text-xs text-text-secondary">(Ctrl+Z)</span>
                </button>
                <button
                  onClick={() => shuffleDeck(currentTurn)}
                  className="w-full rounded-lg bg-bg-section px-3 py-2.5 text-sm text-text-primary hover:bg-bg-primary active:scale-95"
                >
                  Embaralhar Deck
                </button>
              </div>

              <div className="h-px bg-bg-section" />

              {/* Utilitários lado a lado */}
              <div className="flex gap-4">
                <CoinFlip />
                <DiceRoll />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
