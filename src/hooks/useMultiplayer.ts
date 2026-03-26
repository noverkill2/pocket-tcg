import { useState, useEffect, useCallback, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useGameStore } from '../store/gameStore';

// Usa o mesmo host que serviu a página, mas na porta 3002
const SERVER_URL = import.meta.env.VITE_SERVER_URL || `http://${window.location.hostname}:3002`;

export interface ChatMessage {
  message: string;
  playerName: string;
  timestamp: number;
}

// ── Player ID persistente (sobrevive refresh/reconexão) ──
function getPlayerId(): string {
  let id = sessionStorage.getItem('pocket-tcg-player-id');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('pocket-tcg-player-id', id);
  }
  return id;
}

// ── Flag global: true quando aplicando state remoto (evita loop de sync) ──
let applyingRemote = false;
let applyingRemoteCounter = 0;

export function isApplyingRemote() {
  return applyingRemote;
}

function markApplyingRemote() {
  applyingRemote = true;
  applyingRemoteCounter++;
  const currentCounter = applyingRemoteCounter;
  // Liberar somente quando o último setState terminar de propagar
  setTimeout(() => {
    if (applyingRemoteCounter === currentCounter) {
      applyingRemote = false;
    }
  }, 100);
}

// ── Hook principal ──

export function useMultiplayer() {
  const [connected, setConnected] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [playerIndex, setPlayerIndex] = useState<0 | 1>(0);
  const [opponentConnected, setOpponentConnected] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [reconnecting, setReconnecting] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const roomIdRef = useRef<string | null>(null);
  const playerIdRef = useRef(getPlayerId());

  // Callbacks que a MultiplayerPage pode registrar
  const onBothReadyRef = useRef<((decks: [unknown[], unknown[]]) => void) | null>(null);
  const onRestoredRef = useRef<((hadState: boolean) => void) | null>(null);

  // Manter ref do roomId sincronizado
  useEffect(() => { roomIdRef.current = roomId; }, [roomId]);

  // Salvar roomId no sessionStorage para reconexão
  useEffect(() => {
    if (roomId) {
      sessionStorage.setItem('pocket-tcg-room-id', roomId);
    }
  }, [roomId]);

  // ── Conectar ao servidor ──
  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const s = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    s.on('connect', () => {
      console.log('[MP] Connected:', s.id);
      setConnected(true);
      setReconnecting(false);

      // Tentar rejoin automático se tínhamos uma sala
      const savedRoom = sessionStorage.getItem('pocket-tcg-room-id');
      if (savedRoom && !roomIdRef.current) {
        console.log('[MP] Attempting auto-rejoin to room:', savedRoom);
        s.emit('rejoin_room', { playerId: playerIdRef.current }, (res: { success: boolean; roomId?: string; playerIndex?: number; hasState?: boolean }) => {
          if (res.success && res.roomId) {
            console.log('[MP] Rejoined room:', res.roomId, 'as player', res.playerIndex);
            setRoomId(res.roomId);
            setPlayerIndex((res.playerIndex ?? 0) as 0 | 1);
            setOpponentConnected(true);
            onRestoredRef.current?.(res.hasState ?? false);
          } else {
            // Sala não existe mais
            sessionStorage.removeItem('pocket-tcg-room-id');
          }
        });
      }
    });

    s.on('disconnect', () => {
      console.log('[MP] Disconnected');
      setConnected(false);
      setReconnecting(true);
    });

    s.on('reconnect_attempt', (attempt: number) => {
      console.log('[MP] Reconnect attempt:', attempt);
      setReconnecting(true);
    });

    // Oponente entrou na sala
    s.on('player_joined', () => {
      console.log('[MP] Opponent joined');
      setOpponentConnected(true);
    });

    // Oponente reconectou
    s.on('player_reconnected', (_data: { playerIndex: number }) => {
      console.log('[MP] Opponent reconnected');
      setOpponentConnected(true);
    });

    // Oponente desconectou (temporário — pode voltar)
    s.on('player_disconnected', (_data: { playerIndex: number }) => {
      console.log('[MP] Opponent disconnected');
      setOpponentConnected(false);
    });

    // Receber sync_state do oponente
    s.on('sync_state', (state: unknown) => {
      markApplyingRemote();
      useGameStore.setState(state as Partial<ReturnType<typeof useGameStore.getState>>);
    });

    // Restaurar state salvo no servidor (após reconexão)
    s.on('restore_state', (state: unknown) => {
      console.log('[MP] Restoring state from server');
      markApplyingRemote();
      useGameStore.setState(state as Partial<ReturnType<typeof useGameStore.getState>>);
    });

    // Ambos jogadores prontos — hora de iniciar com os decks corretos
    s.on('both_ready', (data: { decks: [unknown[], unknown[]] }) => {
      console.log('[MP] Both players ready, starting game');
      onBothReadyRef.current?.(data.decks);
    });

    // Chat
    s.on('chat_message', (msg: ChatMessage) => {
      setChatMessages(prev => [...prev, msg]);
    });

    socketRef.current = s;
    return s;
  }, []);

  // ── Criar sala ──
  const createRoom = useCallback(() => {
    const s = socketRef.current;
    if (!s) return;
    s.emit('create_room', { playerId: playerIdRef.current }, (data: { roomId: string }) => {
      setRoomId(data.roomId);
      setPlayerIndex(0);
    });
  }, []);

  // ── Entrar na sala ──
  const joinRoom = useCallback((code: string) => {
    const s = socketRef.current;
    if (!s) return Promise.resolve({ success: false, error: 'Não conectado' });
    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      s.emit('join_room', { roomId: code, playerId: playerIdRef.current }, (data: { success: boolean; error?: string; playerIndex?: number }) => {
        if (data.success) {
          setRoomId(code);
          setPlayerIndex((data.playerIndex ?? 1) as 0 | 1);
          setOpponentConnected(true);
        }
        resolve(data);
      });
    });
  }, []);

  // ── Enviar deck para o servidor ──
  const submitDeck = useCallback((deckCards: unknown[]) => {
    const s = socketRef.current;
    const r = roomIdRef.current;
    if (!s || !r) return;
    s.emit('submit_deck', { roomId: r, deck: deckCards });
  }, []);

  // ── Sync state completo ──
  const syncState = useCallback(() => {
    const s = socketRef.current;
    const r = roomIdRef.current;
    if (!s || !r) return;
    const { history, ...state } = useGameStore.getState();
    s.emit('sync_state', { roomId: r, state });
  }, []);

  // ── Chat ──
  const sendChat = useCallback((message: string, playerName: string) => {
    const s = socketRef.current;
    const r = roomIdRef.current;
    if (!s || !r) return;
    s.emit('chat_message', { roomId: r, message, playerName });
  }, []);

  // ── Desconectar (intencional — sair da sala) ──
  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setConnected(false);
    setRoomId(null);
    setOpponentConnected(false);
    setReconnecting(false);
    sessionStorage.removeItem('pocket-tcg-room-id');
  }, []);

  // Cleanup no unmount
  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  // ── Registrar callbacks ──
  const onBothReady = useCallback((cb: (decks: [unknown[], unknown[]]) => void) => {
    onBothReadyRef.current = cb;
  }, []);

  const onRestored = useCallback((cb: (hadState: boolean) => void) => {
    onRestoredRef.current = cb;
  }, []);

  return {
    connect, disconnect,
    connected, reconnecting,
    createRoom, joinRoom,
    roomId, playerIndex,
    opponentConnected,
    submitDeck,
    syncState,
    chatMessages, sendChat,
    onBothReady, onRestored,
  };
}
