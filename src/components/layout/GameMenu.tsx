import { useState, useEffect } from 'react';
import { CoinFlip } from '../ui/CoinFlip';
import { DiceRoll } from '../ui/DiceRoll';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useGameStore } from '../../store/gameStore';

interface GameMenuProps {
  onLeaveRoom?: () => void;
  onDestroyRoom?: () => void;
  isOnline?: boolean;
}

export function GameMenu({ onLeaveRoom, onDestroyRoom, isOnline }: GameMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showDestroyConfirm, setShowDestroyConfirm] = useState(false);
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

              {/* Botões multiplayer */}
              {isOnline && (
                <>
                  <div className="h-px bg-bg-section" />
                  <div className="space-y-2">
                    <button
                      onClick={() => { setIsOpen(false); setShowLeaveConfirm(true); }}
                      className="w-full rounded-lg bg-accent-gold/20 px-3 py-2.5 text-sm font-medium text-accent-gold hover:bg-accent-gold/30 active:scale-95"
                    >
                      Sair da Sala
                    </button>
                    <button
                      onClick={() => { setIsOpen(false); setShowDestroyConfirm(true); }}
                      className="w-full rounded-lg bg-accent-red/20 px-3 py-2.5 text-sm font-medium text-accent-red hover:bg-accent-red/30 active:scale-95"
                    >
                      Encerrar Partida
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        isOpen={showLeaveConfirm}
        title="Sair da Sala"
        message="Você vai voltar ao lobby. A mesa continua ativa por 5 minutos — você pode voltar clicando na sala."
        confirmLabel="Sair"
        variant="danger"
        onConfirm={() => { setShowLeaveConfirm(false); onLeaveRoom?.(); }}
        onCancel={() => setShowLeaveConfirm(false)}
      />

      <ConfirmDialog
        isOpen={showDestroyConfirm}
        title="Encerrar Partida"
        message="A sala será destruída e ambos os jogadores serão removidos. Esta ação não pode ser desfeita."
        confirmLabel="Encerrar"
        variant="danger"
        onConfirm={() => { setShowDestroyConfirm(false); onDestroyRoom?.(); }}
        onCancel={() => setShowDestroyConfirm(false)}
      />
    </div>
  );
}
