import { useState, useEffect, useRef } from 'react';
import { GameBoard } from '../components/board/GameBoard';
import { GameMenu } from '../components/layout/GameMenu';
import { GameLog } from '../components/ui/GameLog';
import { useGameStore } from '../store/gameStore';
import { useDeckStore } from '../store/deckStore';
import { createDeckFromCards } from '../utils/formatCard';
import { useMultiplayer, isApplyingRemote } from '../hooks/useMultiplayer';
import { useToast } from '../components/ui/Toast';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export function MultiplayerPage() {
  const startGame = useGameStore(s => s.startGame);
  const startTurn = useGameStore(s => s.startTurn);
  const drawCard = useGameStore(s => s.drawCard);
  const setupPrizes = useGameStore(s => s.setupPrizes);
  const resetGame = useGameStore(s => s.resetGame);
  const decks = useDeckStore(s => s.decks);
  const loadFromStorage = useDeckStore(s => s.loadFromStorage);
  const { toast } = useToast();

  const mp = useMultiplayer();
  const [phase, setPhase] = useState<'lobby' | 'waiting' | 'deck_select' | 'playing'>('lobby');
  const [joinCode, setJoinCode] = useState('');
  const [selectedDeck, setSelectedDeck] = useState('');
  const [showLog, setShowLog] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const syncUnsubRef = useRef<(() => void) | null>(null);

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);

  useEffect(() => {
    mp.connect();
    return () => mp.disconnect();
  }, []);

  useEffect(() => {
    if (mp.opponentConnected && phase === 'waiting') {
      setPhase('deck_select');
      toast('Oponente conectou!', 'success');
    }
  }, [mp.opponentConnected, phase, toast]);

  // Auto-sync: sempre que o state mudar localmente, sincroniza com o oponente (debounced)
  useEffect(() => {
    if (phase !== 'playing') return;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const unsub = useGameStore.subscribe(() => {
      // Ignorar mudanças causadas por sync remoto (evita loop)
      if (isApplyingRemote()) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => mp.syncState(), 100);
    });
    syncUnsubRef.current = unsub;
    return () => {
      unsub();
      if (debounceTimer) clearTimeout(debounceTimer);
      syncUnsubRef.current = null;
    };
  }, [phase, mp]);

  const handleCreateRoom = () => {
    mp.createRoom();
    setPhase('waiting');
  };

  const handleJoinRoom = async () => {
    const result = await mp.joinRoom(joinCode.toUpperCase());
    if (result.success) {
      setPhase('deck_select');
      toast('Entrou na sala!', 'success');
    } else {
      toast(result.error || 'Erro ao entrar', 'error');
    }
  };

  const handleStartOnline = () => {
    const deckData = decks.find(d => d.id === selectedDeck);
    if (!deckData) { toast('Selecione um deck!', 'error'); return; }

    const cards = createDeckFromCards(deckData.cards);
    const cards2 = createDeckFromCards(deckData.cards);

    // Ambos criam o jogo — host (0) é quem manda o state oficial
    startGame(cards, cards2, 'online');
    setupPrizes(0); setupPrizes(1);
    drawCard(0, 7); drawCard(1, 7);
    startTurn();

    if (mp.playerIndex === 0) {
      // Host sincroniza o state completo para o joiner
      setTimeout(() => mp.syncState(), 200);
    }

    setPhase('playing');
    toast('Jogo online iniciado!', 'success');
  };

  // === LOBBY ===
  if (phase === 'lobby') {
    return (
      <div className="flex min-h-[calc(100vh-60px)] flex-col items-center justify-center gap-8 px-4">
        <h2 className="text-2xl font-bold text-text-primary">Multiplayer</h2>
        <p className="text-sm text-text-secondary">
          {mp.connected ? 'Conectado ao servidor' : 'Conectando...'}
        </p>

        <div className="flex w-full max-w-sm flex-col gap-4">
          <button onClick={handleCreateRoom} disabled={!mp.connected}
            className="rounded-xl bg-accent-blue px-6 py-4 text-lg font-bold text-white active:scale-95 disabled:opacity-30">
            Criar Sala
          </button>

          <div className="text-center text-sm text-text-secondary">ou</div>

          <div className="flex gap-2">
            <input type="text" placeholder="Codigo da sala" value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())} maxLength={6}
              className="flex-1 rounded-lg bg-bg-section px-4 py-3 text-center text-lg font-mono tracking-widest text-text-primary placeholder-text-secondary/50 outline-none focus:ring-2 focus:ring-accent-blue" />
            <button onClick={handleJoinRoom} disabled={!mp.connected || joinCode.length < 4}
              className="rounded-lg bg-accent-green px-6 py-3 font-bold text-bg-primary active:scale-95 disabled:opacity-30">
              Entrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // === WAITING ===
  if (phase === 'waiting') {
    return (
      <div className="flex min-h-[calc(100vh-60px)] flex-col items-center justify-center gap-6 px-4">
        <h2 className="text-2xl font-bold text-text-primary">Sala Criada!</h2>
        <div className="rounded-2xl bg-bg-card p-8 text-center">
          <p className="mb-2 text-sm text-text-secondary">Compartilhe o codigo com seu amigo:</p>
          <p className="font-mono text-4xl font-bold tracking-[0.3em] text-accent-gold">{mp.roomId}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 animate-pulse rounded-full bg-accent-gold" />
          <span className="text-sm text-text-secondary">Aguardando oponente...</span>
        </div>
      </div>
    );
  }

  // === DECK SELECT ===
  if (phase === 'deck_select') {
    return (
      <div className="flex min-h-[calc(100vh-60px)] flex-col items-center justify-center gap-6 px-4">
        <h2 className="text-2xl font-bold text-text-primary">Escolha seu Deck</h2>
        <p className="text-sm text-accent-green">Oponente conectado!</p>
        <div className="w-full max-w-sm space-y-3">
          <select value={selectedDeck} onChange={(e) => setSelectedDeck(e.target.value)}
            className="block w-full rounded-lg bg-bg-section px-4 py-3 text-text-primary outline-none">
            <option value="">Selecionar deck...</option>
            {decks.map(d => <option key={d.id} value={d.id}>{d.name} ({d.cards.length})</option>)}
          </select>
          <button onClick={handleStartOnline} disabled={!selectedDeck}
            className="w-full rounded-xl bg-accent-green px-6 py-4 text-lg font-bold text-bg-primary active:scale-95 disabled:opacity-30">
            Pronto!
          </button>
        </div>
      </div>
    );
  }

  // === PLAYING ===
  return (
    <div className="flex min-h-[calc(100vh-60px)] flex-col p-1 sm:p-4 lg:p-2">
      <div className="mb-1 flex items-center justify-between gap-1 sm:mb-2 sm:gap-2">
        <div className="flex items-center gap-1 sm:gap-2">
          <h2 className="text-xs font-bold text-text-primary sm:text-sm">Online</h2>
          <span className="rounded bg-accent-green/20 px-1.5 py-0.5 text-[8px] font-bold text-accent-green sm:px-2 sm:text-[10px]">
            {mp.roomId}
          </span>
          <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold sm:px-2 sm:text-[10px] ${mp.opponentConnected ? 'bg-accent-green/20 text-accent-green' : 'bg-accent-red/20 text-accent-red'}`}>
            {mp.opponentConnected ? 'Online' : 'Offline'}
          </span>
        </div>
        <div className="flex items-center gap-1 sm:gap-1.5">
          <button onClick={() => setShowLog(!showLog)}
            className="flex h-7 items-center rounded-lg bg-bg-section px-2 text-text-secondary hover:text-text-primary sm:h-9 sm:px-2.5">
            <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </button>
          <GameMenu />
        </div>
      </div>

      {/* Mini chat */}
      <div className="mb-1 flex items-center gap-1 sm:mb-2 sm:gap-2">
        <input type="text" placeholder="Chat..." value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && chatInput.trim()) {
              mp.sendChat(chatInput.trim(), `Jogador ${mp.playerIndex + 1}`);
              setChatInput('');
            }
          }}
          className="flex-1 rounded-lg bg-bg-section px-2 py-1 text-[10px] text-text-primary placeholder-text-secondary/50 outline-none sm:px-3 sm:py-1.5 sm:text-xs" />
        {mp.chatMessages.length > 0 && (
          <span className="max-w-[40%] truncate text-[9px] text-text-secondary sm:text-xs">
            {mp.chatMessages[mp.chatMessages.length - 1].playerName}: {mp.chatMessages[mp.chatMessages.length - 1].message}
          </span>
        )}
      </div>

      {/* Board com perspectiva: seu campo sempre embaixo */}
      <GameBoard perspective={mp.playerIndex} />
      <GameLog isOpen={showLog} onClose={() => setShowLog(false)} />
      <ConfirmDialog isOpen={showResetConfirm} title="Sair" message="Tem certeza?" confirmLabel="Sair" variant="danger"
        onConfirm={() => { resetGame(); mp.disconnect(); setShowResetConfirm(false); }}
        onCancel={() => setShowResetConfirm(false)} />
    </div>
  );
}
