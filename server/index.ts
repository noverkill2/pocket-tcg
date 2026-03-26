import { createServer } from 'http';
import { Server } from 'socket.io';

const httpServer = createServer((_, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Pocket TCG Server OK');
});

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : '*';

const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
  },
});

// ============================================================
// Tipos
// ============================================================

interface PlayerSlot {
  playerId: string;        // ID persistente do jogador (sobrevive reconexão)
  socketId: string | null; // socket.id atual (null = desconectado)
  deck: unknown[] | null;  // deck escolhido pelo jogador
  ready: boolean;          // deck selecionado e pronto
}

interface Room {
  id: string;
  players: [PlayerSlot, PlayerSlot | null]; // [host, joiner]
  state: unknown;                           // último game state sincronizado
  createdAt: number;
  destroyTimer: ReturnType<typeof setTimeout> | null; // timer para destruir sala vazia
}

const rooms = new Map<string, Room>();

// Tempo para manter sala viva após todos saírem (5 minutos)
const ROOM_DESTROY_TIMEOUT = 5 * 60 * 1000;

// Mapeamento rápido: playerId → roomId (para reconexão)
const playerRoomMap = new Map<string, string>();

// ============================================================
// Helpers
// ============================================================

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function findPlayerInRoom(room: Room, playerId: string): { slot: PlayerSlot; index: 0 | 1 } | null {
  for (let i = 0; i < 2; i++) {
    const slot = room.players[i];
    if (slot && slot.playerId === playerId) {
      return { slot, index: i as 0 | 1 };
    }
  }
  return null;
}

function findRoomBySocketId(socketId: string): { room: Room; roomId: string; slot: PlayerSlot; index: 0 | 1 } | null {
  for (const [roomId, room] of rooms) {
    for (let i = 0; i < 2; i++) {
      const slot = room.players[i];
      if (slot && slot.socketId === socketId) {
        return { room, roomId, slot, index: i as 0 | 1 };
      }
    }
  }
  return null;
}

function isPlayerOnline(slot: PlayerSlot | null): boolean {
  return slot !== null && slot.socketId !== null;
}

function cancelDestroyTimer(room: Room) {
  if (room.destroyTimer) {
    clearTimeout(room.destroyTimer);
    room.destroyTimer = null;
  }
}

function scheduleRoomDestroy(roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return;

  cancelDestroyTimer(room);
  room.destroyTimer = setTimeout(() => {
    // Só destruir se ainda não tem ninguém online
    const anyOnline = room.players.some(p => isPlayerOnline(p));
    if (!anyOnline) {
      // Limpar mapeamentos
      for (const p of room.players) {
        if (p) playerRoomMap.delete(p.playerId);
      }
      rooms.delete(roomId);
      console.log(`Room ${roomId} destroyed (timeout)`);
    }
  }, ROOM_DESTROY_TIMEOUT);
}

// ============================================================
// Socket.io
// ============================================================

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // ── Criar sala ──────────────────────────────────────────
  socket.on('create_room', (data: { playerId: string }, callback: (res: { roomId: string }) => void) => {
    let roomId = generateRoomCode();
    while (rooms.has(roomId)) roomId = generateRoomCode();

    const hostSlot: PlayerSlot = {
      playerId: data.playerId,
      socketId: socket.id,
      deck: null,
      ready: false,
    };

    const room: Room = {
      id: roomId,
      players: [hostSlot, null],
      state: null,
      createdAt: Date.now(),
      destroyTimer: null,
    };

    rooms.set(roomId, room);
    playerRoomMap.set(data.playerId, roomId);
    socket.join(roomId);

    console.log(`Room ${roomId} created by ${data.playerId}`);
    callback({ roomId });
  });

  // ── Entrar na sala ──────────────────────────────────────
  socket.on('join_room', (data: { roomId: string; playerId: string }, callback: (res: { success: boolean; error?: string; playerIndex?: number }) => void) => {
    const room = rooms.get(data.roomId);
    if (!room) {
      callback({ success: false, error: 'Sala não encontrada' });
      return;
    }

    // Verificar se o jogador já está na sala (reconexão via join)
    const existing = findPlayerInRoom(room, data.playerId);
    if (existing) {
      existing.slot.socketId = socket.id;
      socket.join(data.roomId);
      cancelDestroyTimer(room);
      callback({ success: true, playerIndex: existing.index });
      socket.to(data.roomId).emit('player_reconnected', { playerIndex: existing.index });
      // Enviar state salvo para restaurar
      if (room.state) {
        socket.emit('restore_state', room.state);
      }
      return;
    }

    // Novo jogador
    if (room.players[1] !== null) {
      callback({ success: false, error: 'Sala cheia' });
      return;
    }

    const joinerSlot: PlayerSlot = {
      playerId: data.playerId,
      socketId: socket.id,
      deck: null,
      ready: false,
    };

    room.players[1] = joinerSlot;
    playerRoomMap.set(data.playerId, data.roomId);
    socket.join(data.roomId);
    cancelDestroyTimer(room);

    console.log(`Player ${data.playerId} joined room ${data.roomId}`);
    callback({ success: true, playerIndex: 1 });

    // Notificar host
    socket.to(data.roomId).emit('player_joined');
  });

  // ── Reconectar à sala ───────────────────────────────────
  socket.on('rejoin_room', (data: { playerId: string }, callback: (res: { success: boolean; roomId?: string; playerIndex?: number; hasState?: boolean }) => void) => {
    const roomId = playerRoomMap.get(data.playerId);
    if (!roomId) {
      callback({ success: false });
      return;
    }

    const room = rooms.get(roomId);
    if (!room) {
      playerRoomMap.delete(data.playerId);
      callback({ success: false });
      return;
    }

    const found = findPlayerInRoom(room, data.playerId);
    if (!found) {
      playerRoomMap.delete(data.playerId);
      callback({ success: false });
      return;
    }

    // Restaurar conexão
    found.slot.socketId = socket.id;
    socket.join(roomId);
    cancelDestroyTimer(room);

    console.log(`Player ${data.playerId} rejoined room ${roomId}`);
    callback({
      success: true,
      roomId,
      playerIndex: found.index,
      hasState: room.state !== null,
    });

    // Enviar state salvo
    if (room.state) {
      socket.emit('restore_state', room.state);
    }

    // Notificar oponente que voltou
    socket.to(roomId).emit('player_reconnected', { playerIndex: found.index });
  });

  // ── Enviar deck (troca de decks) ───────────────────────
  socket.on('submit_deck', (data: { roomId: string; deck: unknown[] }) => {
    const room = rooms.get(data.roomId);
    if (!room) return;

    const found = findRoomBySocketId(socket.id);
    if (!found || found.roomId !== data.roomId) return;

    found.slot.deck = data.deck;
    found.slot.ready = true;

    console.log(`Player ${found.index} submitted deck in room ${data.roomId}`);

    // Se ambos estão prontos, emitir start_game com os dois decks
    const p0 = room.players[0];
    const p1 = room.players[1];
    if (p0 && p1 && p0.ready && p1.ready) {
      io.in(data.roomId).emit('both_ready', {
        decks: [p0.deck, p1.deck],
      });
      console.log(`Both players ready in room ${data.roomId} — starting game`);
    }
  });

  // ── Sync de game state completo ─────────────────────────
  socket.on('sync_state', (data: { roomId: string; state: unknown }) => {
    const room = rooms.get(data.roomId);
    if (room) {
      room.state = data.state;
      socket.to(data.roomId).emit('sync_state', data.state);
    }
  });

  // ── Game action (relay) ─────────────────────────────────
  socket.on('game_action', (data: { roomId: string; action: string; payload: unknown }) => {
    socket.to(data.roomId).emit('game_action', { action: data.action, payload: data.payload });
  });

  // ── Chat ────────────────────────────────────────────────
  socket.on('chat_message', (data: { roomId: string; message: string; playerName: string }) => {
    io.in(data.roomId).emit('chat_message', { message: data.message, playerName: data.playerName, timestamp: Date.now() });
  });

  // ── Desconexão ──────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);

    const found = findRoomBySocketId(socket.id);
    if (!found) return;

    const { room, roomId, slot, index } = found;

    // Marcar como offline (NÃO remove da sala)
    slot.socketId = null;

    // Notificar oponente
    socket.to(roomId).emit('player_disconnected', { playerIndex: index });

    // Se ninguém está online, agendar destruição
    const anyOnline = room.players.some(p => isPlayerOnline(p));
    if (!anyOnline) {
      scheduleRoomDestroy(roomId);
    }

    console.log(`Player ${slot.playerId} (index ${index}) went offline in room ${roomId}`);
  });
});

// ============================================================
// Start
// ============================================================

const PORT = parseInt(process.env.PORT || '3002', 10);
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Pocket TCG Server rodando na porta ${PORT}`);
});
