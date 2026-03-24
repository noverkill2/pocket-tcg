import { useState, useEffect, useCallback } from 'react';
import { GameBoard } from '../components/board/GameBoard';
import { GameMenu } from '../components/layout/GameMenu';
import { GameLog } from '../components/ui/GameLog';
import { useGameStore } from '../store/gameStore';
import { useDeckStore } from '../store/deckStore';
import { createDeckFromCards } from '../utils/formatCard';
import { useToast } from '../components/ui/Toast';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export function GamePage() {
  const gamePhase = useGameStore(s => s.gamePhase);
  const startGame = useGameStore(s => s.startGame);
  const startTurn = useGameStore(s => s.startTurn);
  const drawCard = useGameStore(s => s.drawCard);
  const setupPrizes = useGameStore(s => s.setupPrizes);
  const resetGame = useGameStore(s => s.resetGame);
  const endTurn = useGameStore(s => s.endTurn);
  const undo = useGameStore(s => s.undo);
  const decks = useDeckStore(s => s.decks);
  const loadFromStorage = useDeckStore(s => s.loadFromStorage);
  const { toast } = useToast();

  const [selectedDeck1, setSelectedDeck1] = useState('');
  const [selectedDeck2, setSelectedDeck2] = useState('');
  const [showLog, setShowLog] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (gamePhase !== 'playing') return;
    if (e.key === ' ' && !e.ctrlKey) { e.preventDefault(); endTurn(); }
    if (e.key === 'z' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); undo(); }
    if (e.key === 'l' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); setShowLog(p => !p); }
  }, [gamePhase, endTurn, undo]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleStartGame = () => {
    const d1 = decks.find(d => d.id === selectedDeck1);
    const d2 = decks.find(d => d.id === selectedDeck2);
    if (!d1 || !d2) { toast('Selecione os dois decks!', 'error'); return; }

    const cards1 = createDeckFromCards(d1.cards);
    const cards2 = createDeckFromCards(d2.cards);
    startGame(cards1, cards2, 'local');

    setTimeout(() => {
      setupPrizes(0);
      setupPrizes(1);
      drawCard(0, 7);
      drawCard(1, 7);
      startTurn();
    }, 100);

    toast('Jogo iniciado! Boa partida!', 'success');
  };

  // Tela de seleção
  if (gamePhase === 'setup' || (gamePhase === 'playing' && useGameStore.getState().players[0].deck.length === 0 && useGameStore.getState().turnCount === 0)) {
    return (
      <div className="flex min-h-[calc(100vh-60px)] flex-col items-center justify-center gap-6 px-4">
        <h2 className="text-2xl font-bold text-text-primary sm:text-3xl">Iniciar Partida</h2>

        {decks.length < 2 ? (
          <div className="max-w-md text-center">
            <p className="text-text-secondary">
              Precisa de pelo menos <span className="font-bold text-accent-gold">2 decks</span> para jogar.
            </p>
            <p className="mt-2 text-sm text-text-secondary/70">Monte no Deck Builder primeiro!</p>
          </div>
        ) : (
          <>
            <div className="flex w-full max-w-lg flex-col gap-4 sm:flex-row sm:gap-8">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium text-text-secondary">Jogador 1</label>
                <select value={selectedDeck1} onChange={(e) => setSelectedDeck1(e.target.value)}
                  className="block w-full rounded-lg bg-bg-section px-4 py-3 text-text-primary outline-none ring-1 ring-bg-section focus:ring-accent-blue">
                  <option value="">Selecionar deck...</option>
                  {decks.map(d => <option key={d.id} value={d.id}>{d.name} ({d.cards.length})</option>)}
                </select>
              </div>
              <div className="flex items-end justify-center pb-3 text-2xl font-bold text-text-secondary">VS</div>
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium text-text-secondary">Jogador 2</label>
                <select value={selectedDeck2} onChange={(e) => setSelectedDeck2(e.target.value)}
                  className="block w-full rounded-lg bg-bg-section px-4 py-3 text-text-primary outline-none ring-1 ring-bg-section focus:ring-accent-blue">
                  <option value="">Selecionar deck...</option>
                  {decks.map(d => <option key={d.id} value={d.id}>{d.name} ({d.cards.length})</option>)}
                </select>
              </div>
            </div>
            <button onClick={handleStartGame} disabled={!selectedDeck1 || !selectedDeck2}
              className="rounded-xl bg-accent-green px-10 py-4 text-lg font-bold text-bg-primary active:scale-95 hover:scale-105 disabled:opacity-30 disabled:hover:scale-100">
              Iniciar Jogo
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-60px)] max-h-[calc(100dvh-60px)] flex-col overflow-hidden p-1 sm:p-4 lg:p-2">
      {/* Toolbar compacta */}
      <div className="mb-1 flex items-center justify-between gap-1 sm:mb-3 sm:gap-2">
        <h2 className="text-xs font-bold text-text-primary sm:text-base">Pocket TCG</h2>
        <div className="flex items-center gap-1 sm:gap-2">
          <button onClick={() => setShowLog(!showLog)}
            className="flex h-7 items-center rounded-lg bg-bg-section px-2 text-text-secondary hover:text-text-primary sm:h-10 sm:px-3">
            <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </button>

          <GameMenu />

          <button onClick={() => setShowResetConfirm(true)}
            className="flex h-7 items-center rounded-lg bg-accent-red/20 px-2 text-accent-red sm:h-10 sm:px-3">
            <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <GameBoard />
      </div>
      <GameLog isOpen={showLog} onClose={() => setShowLog(false)} />

      <ConfirmDialog isOpen={showResetConfirm} title="Resetar Jogo"
        message="Tem certeza? Todo o progresso sera perdido." confirmLabel="Resetar" variant="danger"
        onConfirm={() => { resetGame(); setShowResetConfirm(false); toast('Jogo resetado', 'info'); }}
        onCancel={() => setShowResetConfirm(false)} />
    </div>
  );
}
