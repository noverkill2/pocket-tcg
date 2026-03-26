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
import type { PokemonTCGCard } from '../types/card';

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
  const [phase, setPhase] = useState<'lobby' | 'waiting' | 'deck_select' | 'waiting_opponent' | 'playing'>('lobby');
  const [joinCode, setJoinCode] = useState('');
  const [selectedDeck, setSelectedDeck] = useState('');
  const [showLog, setShowLog] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const syncUnsubRef = useRef<(() => void) | null>(null);

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);

  // Conectar ao servidor
  useEffect(() => {
    mp.connect();
    return () => mp.disconnect();
  }, []);

  // Quando oponente entrar na sala, ir para deck_select
  useEffect(() => {
    if (mp.opponentConnected && phase === 'waiting') {
      setPhase('deck_select');
      toast('Oponente conectou!', 'success');
    }
  }, [mp.opponentConnected, phase, toast]);

  // ── Callback: ambos prontos — iniciar jogo com decks corretos ──
  useEffect(() => {
    mp.onBothReady((rawDecks: [unknown[], unknown[]]) => {
      const deck0Cards = rawDecks[0] as PokemonTCGCard[];
      const deck1Cards = rawDecks[1] as PokemonTCGCard[];

      const deck0 = createDeckFromCards(deck0Cards);
      const deck1 = createDeckFromCards(deck1Cards);

      // Iniciar jogo com os decks corretos (player 0 = host, player 1 = joiner)
      startGame(deck0, deck1, 'online');
      setupPrizes(0); setupPrizes(1);
      drawCard(0, 7); drawCard(1, 7);
      startTurn();

      // Host sincroniza o state oficial
      if (mp.playerIndex === 0) {
        setTimeout(() => mp.syncState(), 200);
      }

      setPhase('playing');
      toast('Jogo online iniciado!', 'success');
    });
  }, [mp, startGame, setupPrizes, drawCard, startTurn, toast]);

  // ── Callback: restauração após reconexão ──
  useEffect(() => {
    mp.onRestored((hadState: boolean) => {
      if (hadState) {
        // Tinha partida em andamento — voltar direto para playing
        setPhase('playing');
        toast('Reconectado! Partida restaurada.', 'success');
      } else {
        // Sala existe mas sem partida — voltar para deck_select
        setPhase('deck_select');
        toast('Reconectado à sala!', 'success');
      }
    });
  }, [mp, toast]);

  // ── Auto-sync: quando state muda localmente, enviar para oponente ──
  useEffect(() => {
    if (phase !== 'playing') return;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const unsub = useGameStore.subscribe(() => {
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

  // ── Quando oponente reconecta durante partida, reenviar state ──
  useEffect(() => {
    if (phase === 'playing' && mp.opponentConnected) {
      // Pequeno delay para garantir que o oponente está pronto
      const timer = setTimeout(() => mp.syncState(), 300);
      return () => clearTimeout(timer);
    }
  }, [mp.opponentConnected, phase, mp]);

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

  const handleSubmitDeck = () => {
    const deckData = decks.find(d => d.id === selectedDeck);
    if (!deckData) { toast('Selecione um deck!', 'error'); return; }

    // Enviar cartas RAW (PokemonTCGCard[]) para o servidor
    mp.submitDeck(deckData.cards);
    setPhase('waiting_opponent');
    toast('Deck enviado! Aguardando oponente...', 'success');
  };

  // === LOBBY ===
  if (phase === 'lobby') {
    return (
      <div className="flex min-h-[calc(100vh-60px)] flex-col items-center justify-center gap-8 px-4">
        <h2 className="text-2xl font-bold text-text-primary">Multiplayer</h2>
        <p className="text-sm text-text-secondary">
          {mp.reconnecting ? 'Reconectando...' : mp.connected ? 'Conectado ao servidor' : 'Conectando...'}
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

  // === WAITING (host aguardando oponente) ===
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
          <button onClick={handleSubmitDeck} disabled={!selectedDeck}
            className="w-full rounded-xl bg-accent-green px-6 py-4 text-lg font-bold text-bg-primary active:scale-95 disabled:opacity-30">
            Pronto!
          </button>
        </div>
      </div>
    );
  }

  // === WAITING FOR OPPONENT DECK ===
  if (phase === 'waiting_opponent') {
    return (
      <div className="flex min-h-[calc(100vh-60px)] flex-col items-center justify-center gap-6 px-4">
        <h2 className="text-2xl font-bold text-text-primary">Deck Enviado!</h2>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 animate-pulse rounded-full bg-accent-blue" />
          <span className="text-sm text-text-secondary">Aguardando oponente escolher deck...</span>
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
            {mp.opponentConnected ? 'Online' : mp.reconnecting ? 'Reconectando...' : 'Offline'}
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

      {/* Indicador de reconexão */}
      {(!mp.connected || mp.reconnecting) && (
        <div className="mb-2 flex items-center justify-center gap-2 rounded-lg bg-accent-gold/20 px-3 py-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-accent-gold" />
          <span className="text-xs font-medium text-accent-gold">Reconectando ao servidor...</span>
        </div>
      )}

      {/* Board com perspectiva: seu campo sempre embaixo */}
      <GameBoard perspective={mp.playerIndex} />
      <GameLog isOpen={showLog} onClose={() => setShowLog(false)} />
      <ConfirmDialog isOpen={showResetConfirm} title="Sair" message="Tem certeza?" confirmLabel="Sair" variant="danger"
        onConfirm={() => { resetGame(); mp.disconnect(); setShowResetConfirm(false); }}
        onCancel={() => setShowResetConfirm(false)} />
    </div>
  );
}
