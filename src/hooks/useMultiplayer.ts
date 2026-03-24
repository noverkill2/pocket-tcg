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

// Flag global: true quando estamos aplicando state remoto (evita loop de sync)
let applyingRemote = false;

export function useMultiplayer() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [playerIndex, setPlayerIndex] = useState<0 | 1>(0);
  const [opponentConnected, setOpponentConnected] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const roomIdRef = useRef<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Manter refs atualizados
  useEffect(() => { roomIdRef.current = roomId; }, [roomId]);
  useEffect(() => { socketRef.current = socket; }, [socket]);

  // Conectar ao servidor
  const connect = useCallback(() => {
    const s = io(SERVER_URL, { transports: ['websocket'] });
    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => { setConnected(false); setOpponentConnected(false); });

    s.on('player_joined', () => setOpponentConnected(true));
    s.on('player_disconnected', () => setOpponentConnected(false));

    s.on('sync_state', (state: unknown) => {
      // Marcar que estamos aplicando state remoto
      applyingRemote = true;
      useGameStore.setState(state as Partial<ReturnType<typeof useGameStore.getState>>);
      // Liberar flag após o ciclo de setState completar
      setTimeout(() => { applyingRemote = false; }, 50);
    });

    s.on('chat_message', (msg: ChatMessage) => {
      setChatMessages(prev => [...prev, msg]);
    });

    setSocket(s);
    return s;
  }, []);

  // Criar sala
  const createRoom = useCallback(() => {
    if (!socket) return;
    socket.emit('create_room', (data: { roomId: string }) => {
      setRoomId(data.roomId);
      setPlayerIndex(0);
    });
  }, [socket]);

  // Entrar na sala
  const joinRoom = useCallback((code: string) => {
    if (!socket) return Promise.resolve({ success: false, error: 'Nao conectado' });
    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      socket.emit('join_room', code, (data: { success: boolean; error?: string; playerIndex?: number }) => {
        if (data.success) {
          setRoomId(code);
          setPlayerIndex((data.playerIndex || 1) as 0 | 1);
          setOpponentConnected(true);
        }
        resolve(data);
      });
    });
  }, [socket]);

  // Sync state completo (chamado automaticamente via subscribe)
  const syncState = useCallback(() => {
    const s = socketRef.current;
    const r = roomIdRef.current;
    if (!s || !r) return;
    const { history, ...state } = useGameStore.getState();
    s.emit('sync_state', { roomId: r, state });
  }, []);

  // Chat
  const sendChat = useCallback((message: string, playerName: string) => {
    if (!socket || !roomId) return;
    socket.emit('chat_message', { roomId, message, playerName });
  }, [socket, roomId]);

  // Desconectar
  const disconnect = useCallback(() => {
    socket?.disconnect();
    setSocket(null);
    setConnected(false);
    setRoomId(null);
    setOpponentConnected(false);
  }, [socket]);

  useEffect(() => {
    return () => { socket?.disconnect(); };
  }, [socket]);

  return {
    connect, disconnect,
    connected, socket,
    createRoom, joinRoom,
    roomId, playerIndex,
    opponentConnected,
    syncState,
    chatMessages, sendChat,
    applyingRemoteFlag: applyingRemote,
  };
}

// Exportar para uso no auto-sync
export function isApplyingRemote() {
  return applyingRemote;
}
