import { useState, useEffect, useCallback, useRef, createContext, useContext, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useGameStore } from '../store/gameStore';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || `http://${window.location.hostname}:3002`;

export interface ChatMessage {
  message: string;
  playerName: string;
  timestamp: number;
}

export interface RoomInfo {
  id: string;
  name: string;
  hasPassword: boolean;
  hostName: string;
  players: number;
  status: string;
}

// ── Player ID persistente ──
function getPlayerId(): string {
  let id = localStorage.getItem('pocket-tcg-player-id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('pocket-tcg-player-id', id);
  }
  return id;
}

// ── Flag anti-loop ──
// Usa queueMicrotask pra desbloquear logo após os subscribers do Zustand rodarem
// (eles rodam síncrono no setState). Antes usava setTimeout(100ms) que podia
// se sobrepor e bloquear syncs legítimos por tempo demais.
let applyingRemote = false;

export function isApplyingRemote() {
  return applyingRemote;
}

function markApplyingRemote() {
  applyingRemote = true;
  queueMicrotask(() => {
    applyingRemote = false;
  });
}

// ── Tipo do contexto ──
interface MultiplayerContextValue {
  connect: () => void;
  disconnect: () => void;
  leaveToLobby: () => void;
  connected: boolean;
  reconnecting: boolean;
  createRoom: (roomName: string, password: string, playerName: string) => void;
  joinRoom: (code: string, password: string, playerName: string) => Promise<{ success: boolean; error?: string; opponentOnline: boolean }>;
  roomId: string | null;
  playerIndex: 0 | 1;
  opponentConnected: boolean;
  roomList: RoomInfo[];
  refreshRooms: () => void;
  submitDeck: (deckCards: unknown[]) => void;
  syncState: () => void;
  chatMessages: ChatMessage[];
  sendChat: (message: string, playerName: string) => void;
  onBothReady: (cb: (decks: [unknown[], unknown[]]) => void) => void;
  onRestored: (cb: (hadState: boolean) => void) => void;
  onPlayerJoined: (cb: (data: { playerName: string }) => void) => void;
}

const MultiplayerContext = createContext<MultiplayerContextValue | null>(null);

// ── Hook público ──
export function useMultiplayer() {
  const ctx = useContext(MultiplayerContext);
  if (!ctx) throw new Error('useMultiplayer must be used within MultiplayerProvider');
  return ctx;
}

// ── Provider (vive no App, nunca desmonta) ──
export function MultiplayerProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [playerIndex, setPlayerIndex] = useState<0 | 1>(0);
  const [opponentConnected, setOpponentConnected] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [reconnecting, setReconnecting] = useState(false);
  const [roomList, setRoomList] = useState<RoomInfo[]>([]);

  const socketRef = useRef<Socket | null>(null);
  const roomIdRef = useRef<string | null>(null);
  const playerIdRef = useRef(getPlayerId());

  const onBothReadyRef = useRef<((decks: [unknown[], unknown[]]) => void) | null>(null);
  const onRestoredRef = useRef<((hadState: boolean) => void) | null>(null);
  const onPlayerJoinedRef = useRef<((data: { playerName: string }) => void) | null>(null);

  useEffect(() => { roomIdRef.current = roomId; }, [roomId]);

  useEffect(() => {
    if (roomId) {
      localStorage.setItem('pocket-tcg-room-id', roomId);
    }
  }, [roomId]);

  // ── Conectar ──
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

      // Auto-rejoin (sempre tenta quando tem sala salva — cobre refresh E reconnect)
      const savedRoom = localStorage.getItem('pocket-tcg-room-id');
      if (savedRoom) {
        const wasAlreadyInRoom = !!roomIdRef.current;
        s.emit('rejoin_room', { playerId: playerIdRef.current }, (res: { success: boolean; roomId?: string; playerIndex?: number; hasState?: boolean; opponentOnline?: boolean }) => {
          if (res.success && res.roomId) {
            setRoomId(res.roomId);
            setPlayerIndex((res.playerIndex ?? 0) as 0 | 1);
            setOpponentConnected(res.opponentOnline ?? false);
            // Só dispara onRestored se é mount fresco (page refresh)
            // No reconnect do socket, o state local já está correto
            if (!wasAlreadyInRoom) {
              onRestoredRef.current?.(res.hasState ?? false);
            }
          } else {
            localStorage.removeItem('pocket-tcg-room-id');
            if (wasAlreadyInRoom) {
              setRoomId(null);
              setOpponentConnected(false);
            }
          }
        });
      }
    });

    s.on('disconnect', () => {
      setConnected(false);
      setReconnecting(true);
    });

    s.on('reconnect_attempt', () => {
      setReconnecting(true);
    });

    s.on('room_list', (list: RoomInfo[]) => {
      setRoomList(list);
    });

    s.on('player_joined', (data: { playerName: string }) => {
      setOpponentConnected(true);
      onPlayerJoinedRef.current?.(data);
    });

    s.on('player_reconnected', () => {
      setOpponentConnected(true);
    });

    s.on('player_disconnected', () => {
      setOpponentConnected(false);
    });

    s.on('sync_state', (state: unknown) => {
      markApplyingRemote();
      useGameStore.setState(state as Partial<ReturnType<typeof useGameStore.getState>>);
    });

    s.on('restore_state', (state: unknown) => {
      markApplyingRemote();
      useGameStore.setState(state as Partial<ReturnType<typeof useGameStore.getState>>);
    });

    s.on('both_ready', (data: { decks: [unknown[], unknown[]] }) => {
      onBothReadyRef.current?.(data.decks);
    });

    s.on('chat_message', (msg: ChatMessage) => {
      setChatMessages(prev => [...prev, msg]);
    });

    socketRef.current = s;
  }, []);

  // ── Criar sala ──
  const createRoom = useCallback((roomName: string, password: string, playerName: string) => {
    const s = socketRef.current;
    if (!s) return;
    s.emit('create_room', {
      playerId: playerIdRef.current,
      roomName,
      password: password || undefined,
      playerName,
    }, (data: { roomId: string }) => {
      setRoomId(data.roomId);
      setPlayerIndex(0);
    });
  }, []);

  // ── Entrar na sala ──
  const joinRoom = useCallback((code: string, password: string, playerName: string) => {
    const s = socketRef.current;
    if (!s) return Promise.resolve({ success: false, error: 'Não conectado', opponentOnline: false });
    return new Promise<{ success: boolean; error?: string; opponentOnline: boolean }>((resolve) => {
      s.emit('join_room', {
        roomId: code,
        playerId: playerIdRef.current,
        password: password || undefined,
        playerName,
      }, (data: { success: boolean; error?: string; playerIndex?: number; opponentOnline?: boolean }) => {
        const opponentOnline = data.opponentOnline ?? false;
        if (data.success) {
          setRoomId(code);
          setPlayerIndex((data.playerIndex ?? 1) as 0 | 1);
          setOpponentConnected(opponentOnline);
        }
        resolve({ ...data, opponentOnline });
      });
    });
  }, []);

  // ── Pedir lista ──
  const refreshRooms = useCallback(() => {
    const s = socketRef.current;
    if (!s) return;
    s.emit('list_rooms', (list: RoomInfo[]) => {
      setRoomList(list);
    });
  }, []);

  // ── Enviar deck ──
  const submitDeck = useCallback((deckCards: unknown[]) => {
    const s = socketRef.current;
    const r = roomIdRef.current;
    if (!s || !r) return;
    s.emit('submit_deck', { roomId: r, deck: deckCards });
  }, []);

  // ── Sync state ──
  const syncState = useCallback(() => {
    const s = socketRef.current;
    const r = roomIdRef.current;
    if (!s || !r) return;
    const { history, log, ...state } = useGameStore.getState();
    // Envia só as últimas 20 entradas do log pra não inflar o payload
    s.emit('sync_state', { roomId: r, state: { ...state, log: log.slice(-20) } });
  }, []);

  // ── Chat ──
  const sendChat = useCallback((message: string, playerName: string) => {
    const s = socketRef.current;
    const r = roomIdRef.current;
    if (!s || !r) return;
    s.emit('chat_message', { roomId: r, message, playerName });
  }, []);

  // ── Voltar ao lobby ──
  const leaveToLobby = useCallback(() => {
    const s = socketRef.current;
    const r = roomIdRef.current;
    if (s && r) {
      s.emit('leave_room', { roomId: r });
    }
    setRoomId(null);
    setOpponentConnected(false);
    localStorage.removeItem('pocket-tcg-room-id');
  }, []);

  // ── Desconectar de verdade ──
  const disconnect = useCallback(() => {
    const s = socketRef.current;
    const r = roomIdRef.current;
    if (s && r) {
      s.emit('leave_room', { roomId: r });
    }
    s?.disconnect();
    socketRef.current = null;
    setConnected(false);
    setRoomId(null);
    setOpponentConnected(false);
    setReconnecting(false);
    localStorage.removeItem('pocket-tcg-room-id');
  }, []);

  // ── Callbacks ──
  const onBothReady = useCallback((cb: (decks: [unknown[], unknown[]]) => void) => {
    onBothReadyRef.current = cb;
  }, []);

  const onRestored = useCallback((cb: (hadState: boolean) => void) => {
    onRestoredRef.current = cb;
  }, []);

  const onPlayerJoined = useCallback((cb: (data: { playerName: string }) => void) => {
    onPlayerJoinedRef.current = cb;
  }, []);

  const value: MultiplayerContextValue = {
    connect, disconnect, leaveToLobby,
    connected, reconnecting,
    createRoom, joinRoom,
    roomId, playerIndex,
    opponentConnected,
    roomList, refreshRooms,
    submitDeck,
    syncState,
    chatMessages, sendChat,
    onBothReady, onRestored, onPlayerJoined,
  };

  return <MultiplayerContext.Provider value={value}>{children}</MultiplayerContext.Provider>;
}
