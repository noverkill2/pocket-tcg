import { useState, useEffect, useRef } from 'react';
import { GameBoard } from '../components/board/GameBoard';
import { GameMenu } from '../components/layout/GameMenu';
import { GameLog } from '../components/ui/GameLog';
import { useGameStore } from '../store/gameStore';
import { useDeckStore } from '../store/deckStore';
import { createDeckFromCards } from '../utils/formatCard';
import { useMultiplayer, isApplyingRemote } from '../hooks/useMultiplayer';
import type { RoomInfo } from '../hooks/useMultiplayer';
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
  const [selectedDeck, setSelectedDeck] = useState('');
  const [showLog, setShowLog] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const syncUnsubRef = useRef<(() => void) | null>(null);

  // Lobby state
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('pocket-tcg-player-name') || '');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomPassword, setNewRoomPassword] = useState('');
  const [joiningRoom, setJoiningRoom] = useState<RoomInfo | null>(null);
  const [joinPassword, setJoinPassword] = useState('');

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);

  // Salvar nome do jogador
  useEffect(() => {
    if (playerName) localStorage.setItem('pocket-tcg-player-name', playerName);
  }, [playerName]);

  // Conectar ao servidor
  useEffect(() => {
    mp.connect();
    return () => mp.disconnect();
  }, []);

  // Quando oponente entrar na sala (host)
  useEffect(() => {
    mp.onPlayerJoined((data) => {
      if (phase === 'waiting') {
        setPhase('deck_select');
        toast(`${data.playerName} entrou na sala!`, 'success');
      }
    });
  }, [mp, phase, toast]);

  // Ambos prontos — iniciar jogo
  useEffect(() => {
    mp.onBothReady((rawDecks: [unknown[], unknown[]]) => {
      const deck0 = createDeckFromCards(rawDecks[0] as PokemonTCGCard[]);
      const deck1 = createDeckFromCards(rawDecks[1] as PokemonTCGCard[]);

      startGame(deck0, deck1, 'online');
      setupPrizes(0); setupPrizes(1);
      drawCard(0, 7); drawCard(1, 7);
      startTurn();

      if (mp.playerIndex === 0) {
        setTimeout(() => mp.syncState(), 200);
      }

      setPhase('playing');
      toast('Jogo online iniciado!', 'success');
    });
  }, [mp, startGame, setupPrizes, drawCard, startTurn, toast]);

  // Restauração após reconexão
  useEffect(() => {
    mp.onRestored((hadState: boolean) => {
      if (hadState) {
        setPhase('playing');
        toast('Reconectado! Partida restaurada.', 'success');
      } else {
        setPhase('deck_select');
        toast('Reconectado a sala!', 'success');
      }
    });
  }, [mp, toast]);

  // Auto-sync durante jogo
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

  // Re-sync quando oponente reconecta
  useEffect(() => {
    if (phase === 'playing' && mp.opponentConnected) {
      const timer = setTimeout(() => mp.syncState(), 300);
      return () => clearTimeout(timer);
    }
  }, [mp.opponentConnected, phase, mp]);

  // ── Handlers ──

  const handleCreateRoom = () => {
    if (!playerName.trim()) { toast('Digite seu nome!', 'error'); return; }
    const name = newRoomName.trim() || `Sala de ${playerName}`;
    mp.createRoom(name, newRoomPassword, playerName.trim());
    setShowCreateModal(false);
    setNewRoomName('');
    setNewRoomPassword('');
    setPhase('waiting');
  };

  const handleJoinFromLobby = async (room: RoomInfo) => {
    if (!playerName.trim()) { toast('Digite seu nome!', 'error'); return; }
    if (room.hasPassword) {
      setJoiningRoom(room);
      setJoinPassword('');
      return;
    }
    const result = await mp.joinRoom(room.id, '', playerName.trim());
    if (result.success) {
      // Se tem oponente → deck_select, senão → waiting
      setPhase(mp.opponentConnected ? 'deck_select' : 'waiting');
      toast('Entrou na sala!', 'success');
    } else {
      toast(result.error || 'Erro ao entrar', 'error');
    }
  };

  const handleJoinWithPassword = async () => {
    if (!joiningRoom) return;
    const result = await mp.joinRoom(joiningRoom.id, joinPassword, playerName.trim());
    if (result.success) {
      setJoiningRoom(null);
      setJoinPassword('');
      setPhase(mp.opponentConnected ? 'deck_select' : 'waiting');
      toast('Entrou na sala!', 'success');
    } else {
      toast(result.error || 'Senha incorreta', 'error');
    }
  };

  const handleSubmitDeck = () => {
    const deckData = decks.find(d => d.id === selectedDeck);
    if (!deckData) { toast('Selecione um deck!', 'error'); return; }
    mp.submitDeck(deckData.cards);
    setPhase('waiting_opponent');
    toast('Deck enviado! Aguardando oponente...', 'success');
  };

  // === LOBBY ===
  if (phase === 'lobby') {
    const waitingRooms = mp.roomList.filter(r => r.status === 'waiting');
    const activeRooms = mp.roomList.filter(r => r.status !== 'waiting');

    return (
      <div className="flex min-h-[calc(100vh-60px)] flex-col px-4 py-6">
        {/* Header */}
        <div className="mx-auto w-full max-w-lg">
          <h2 className="mb-1 text-2xl font-bold text-text-primary">Lobby</h2>
          <p className="mb-4 text-sm text-text-secondary">
            {mp.reconnecting ? 'Reconectando...' : mp.connected ? 'Conectado ao servidor' : 'Conectando...'}
          </p>

          {/* Nome do jogador */}
          <div className="mb-4">
            <input type="text" placeholder="Seu nome..." value={playerName}
              onChange={(e) => setPlayerName(e.target.value)} maxLength={20}
              className="w-full rounded-lg bg-bg-section px-4 py-3 text-sm text-text-primary placeholder-text-secondary/50 outline-none focus:ring-2 focus:ring-accent-blue" />
          </div>

          {/* Botão criar sala */}
          <button onClick={() => setShowCreateModal(true)} disabled={!mp.connected || !playerName.trim()}
            className="mb-6 w-full rounded-xl bg-accent-blue px-6 py-4 text-lg font-bold text-white active:scale-95 disabled:opacity-30">
            + Criar Sala
          </button>

          {/* Lista de salas aguardando */}
          <div className="mb-4">
            <h3 className="mb-2 text-sm font-bold text-text-secondary uppercase tracking-wider">
              Salas Abertas ({waitingRooms.length})
            </h3>
            {waitingRooms.length === 0 ? (
              <div className="rounded-xl bg-bg-section p-6 text-center text-sm text-text-secondary">
                Nenhuma sala aberta no momento. Crie uma!
              </div>
            ) : (
              <div className="space-y-2">
                {waitingRooms.map(room => (
                  <button key={room.id} onClick={() => handleJoinFromLobby(room)}
                    disabled={!mp.connected || !playerName.trim()}
                    className="flex w-full items-center gap-3 rounded-xl bg-bg-card p-4 text-left transition-colors hover:bg-bg-section active:scale-[0.98] disabled:opacity-30">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-bold text-text-primary">{room.name}</span>
                        {room.hasPassword && (
                          <svg className="h-3.5 w-3.5 flex-shrink-0 text-accent-gold" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <span className="text-xs text-text-secondary">Host: {room.hostName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-accent-green/20 px-2 py-0.5 text-[10px] font-bold text-accent-green">
                        {room.players}/2
                      </span>
                      <span className="text-xs font-mono text-text-secondary">{room.id}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Salas em jogo */}
          {activeRooms.length > 0 && (
            <div className="mb-4">
              <h3 className="mb-2 text-sm font-bold text-text-secondary uppercase tracking-wider">
                Em Jogo ({activeRooms.length})
              </h3>
              <div className="space-y-2">
                {activeRooms.map(room => (
                  <div key={room.id}
                    className="flex w-full items-center gap-3 rounded-xl bg-bg-section p-4 opacity-60">
                    <div className="flex-1 min-w-0">
                      <span className="truncate text-sm font-medium text-text-primary">{room.name}</span>
                      <div className="text-xs text-text-secondary">Host: {room.hostName}</div>
                    </div>
                    <span className="rounded-full bg-accent-red/20 px-2 py-0.5 text-[10px] font-bold text-accent-red">
                      Jogando
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal: Criar Sala */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowCreateModal(false)}>
            <div className="w-full max-w-sm rounded-xl bg-bg-card p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
              <h3 className="mb-4 text-lg font-bold text-text-primary">Criar Sala</h3>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-text-secondary">Nome da sala</label>
                  <input type="text" placeholder={`Sala de ${playerName}`} value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)} maxLength={30}
                    className="w-full rounded-lg bg-bg-section px-4 py-3 text-sm text-text-primary placeholder-text-secondary/50 outline-none focus:ring-2 focus:ring-accent-blue" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-text-secondary">Senha (opcional)</label>
                  <input type="text" placeholder="Deixe vazio para sala aberta" value={newRoomPassword}
                    onChange={(e) => setNewRoomPassword(e.target.value)} maxLength={20}
                    className="w-full rounded-lg bg-bg-section px-4 py-3 text-sm text-text-primary placeholder-text-secondary/50 outline-none focus:ring-2 focus:ring-accent-blue" />
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setShowCreateModal(false)}
                    className="flex-1 rounded-lg bg-bg-section px-4 py-3 text-sm text-text-secondary hover:text-text-primary">
                    Cancelar
                  </button>
                  <button onClick={handleCreateRoom}
                    className="flex-1 rounded-lg bg-accent-blue px-4 py-3 text-sm font-bold text-white active:scale-95">
                    Criar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Senha pra entrar */}
        {joiningRoom && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setJoiningRoom(null)}>
            <div className="w-full max-w-sm rounded-xl bg-bg-card p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
              <h3 className="mb-2 text-lg font-bold text-text-primary">{joiningRoom.name}</h3>
              <p className="mb-4 text-sm text-text-secondary">Esta sala requer senha para entrar.</p>
              <input type="text" placeholder="Digite a senha..." value={joinPassword}
                onChange={(e) => setJoinPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleJoinWithPassword(); }}
                autoFocus
                className="mb-4 w-full rounded-lg bg-bg-section px-4 py-3 text-sm text-text-primary placeholder-text-secondary/50 outline-none focus:ring-2 focus:ring-accent-blue" />
              <div className="flex gap-2">
                <button onClick={() => setJoiningRoom(null)}
                  className="flex-1 rounded-lg bg-bg-section px-4 py-3 text-sm text-text-secondary hover:text-text-primary">
                  Cancelar
                </button>
                <button onClick={handleJoinWithPassword} disabled={!joinPassword}
                  className="flex-1 rounded-lg bg-accent-green px-4 py-3 text-sm font-bold text-bg-primary active:scale-95 disabled:opacity-30">
                  Entrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // === WAITING (host aguardando oponente) ===
  if (phase === 'waiting') {
    return (
      <div className="flex min-h-[calc(100vh-60px)] flex-col items-center justify-center gap-6 px-4">
        <h2 className="text-2xl font-bold text-text-primary">Sala Criada!</h2>
        <div className="rounded-2xl bg-bg-card p-8 text-center">
          <p className="mb-2 text-sm text-text-secondary">Codigo da sala:</p>
          <p className="font-mono text-4xl font-bold tracking-[0.3em] text-accent-gold">{mp.roomId}</p>
          <p className="mt-3 text-xs text-text-secondary">Sua sala aparece no lobby para outros jogadores.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 animate-pulse rounded-full bg-accent-gold" />
          <span className="text-sm text-text-secondary">Aguardando oponente...</span>
        </div>
        <button onClick={() => { mp.leaveToLobby(); setPhase('lobby'); }}
          className="rounded-lg bg-bg-section px-4 py-2 text-sm text-text-secondary hover:text-text-primary">
          Voltar ao Lobby
        </button>
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
        <button onClick={() => { mp.leaveToLobby(); setPhase('lobby'); }}
          className="rounded-lg bg-bg-section px-4 py-2 text-sm text-text-secondary hover:text-text-primary">
          Voltar ao Lobby
        </button>
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
        <button onClick={() => { mp.leaveToLobby(); setPhase('lobby'); }}
          className="rounded-lg bg-bg-section px-4 py-2 text-sm text-text-secondary hover:text-text-primary">
          Voltar ao Lobby
        </button>
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
              mp.sendChat(chatInput.trim(), playerName || `Jogador ${mp.playerIndex + 1}`);
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

      <GameBoard perspective={mp.playerIndex} />
      <GameLog isOpen={showLog} onClose={() => setShowLog(false)} />
      <ConfirmDialog isOpen={showResetConfirm} title="Sair" message="Tem certeza?" confirmLabel="Sair" variant="danger"
        onConfirm={() => { resetGame(); mp.disconnect(); setShowResetConfirm(false); }}
        onCancel={() => setShowResetConfirm(false)} />
    </div>
  );
}
