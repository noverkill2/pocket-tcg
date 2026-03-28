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
  playerId: string;
  socketId: string | null;
  deck: unknown[] | null;
  ready: boolean;
  name: string;
}

interface Room {
  id: string;
  name: string;
  password: string | null;       // null = sala aberta
  hostName: string;
  players: [PlayerSlot, PlayerSlot | null];
  state: unknown;
  status: 'waiting' | 'selecting' | 'playing';
  createdAt: number;
  destroyTimer: ReturnType<typeof setTimeout> | null;
}

const rooms = new Map<string, Room>();
const ROOM_DESTROY_TIMEOUT = 5 * 60 * 1000;
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
    const anyOnline = room.players.some(p => isPlayerOnline(p));
    if (!anyOnline) {
      for (const p of room.players) {
        if (p) playerRoomMap.delete(p.playerId);
      }
      rooms.delete(roomId);
      broadcastRoomList();
      console.log(`Room ${roomId} destroyed (timeout)`);
    }
  }, ROOM_DESTROY_TIMEOUT);
}

// Monta a lista pública de salas (sem senhas, sem state)
function getRoomList() {
  const list: {
    id: string;
    name: string;
    hasPassword: boolean;
    hostName: string;
    players: number;
    status: string;
  }[] = [];

  for (const [id, room] of rooms) {
    list.push({
      id,
      name: room.name,
      hasPassword: room.password !== null,
      hostName: room.hostName,
      players: room.players.filter(p => isPlayerOnline(p)).length,
      status: room.status,
    });
  }
  return list;
}

function broadcastRoomList() {
  io.emit('room_list', getRoomList());
}

// ============================================================
// Socket.io
// ============================================================

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Enviar lista de salas ao conectar
  socket.emit('room_list', getRoomList());

  // ── Pedir lista de salas ────────────────────────────────
  socket.on('list_rooms', (callback: (rooms: ReturnType<typeof getRoomList>) => void) => {
    callback(getRoomList());
  });

  // ── Criar sala ──────────────────────────────────────────
  socket.on('create_room', (data: { playerId: string; roomName: string; password?: string; playerName: string }, callback: (res: { roomId: string }) => void) => {
    let roomId = generateRoomCode();
    while (rooms.has(roomId)) roomId = generateRoomCode();

    const hostSlot: PlayerSlot = {
      playerId: data.playerId,
      socketId: socket.id,
      deck: null,
      ready: false,
      name: data.playerName || 'Jogador 1',
    };

    const room: Room = {
      id: roomId,
      name: data.roomName || `Sala ${roomId}`,
      password: data.password && data.password.trim() !== '' ? data.password.trim() : null,
      hostName: hostSlot.name,
      players: [hostSlot, null],
      state: null,
      status: 'waiting',
      createdAt: Date.now(),
      destroyTimer: null,
    };

    rooms.set(roomId, room);
    playerRoomMap.set(data.playerId, roomId);
    socket.join(roomId);

    console.log(`Room ${roomId} "${room.name}" created by ${data.playerName}`);
    callback({ roomId });
    broadcastRoomList();
  });

  // ── Entrar na sala ──────────────────────────────────────
  socket.on('join_room', (data: { roomId: string; playerId: string; password?: string; playerName: string }, callback: (res: { success: boolean; error?: string; playerIndex?: number; opponentOnline?: boolean; hasState?: boolean }) => void) => {
    const room = rooms.get(data.roomId);
    if (!room) {
      callback({ success: false, error: 'Sala não encontrada' });
      return;
    }

    // Reconexão (jogador já tem slot na sala)
    const existing = findPlayerInRoom(room, data.playerId);
    if (existing) {
      existing.slot.socketId = socket.id;
      existing.slot.name = data.playerName || existing.slot.name;
      playerRoomMap.set(data.playerId, data.roomId);
      socket.join(data.roomId);
      cancelDestroyTimer(room);
      const opponentIdx = existing.index === 0 ? 1 : 0;
      const opponentOnline = isPlayerOnline(room.players[opponentIdx]);
      callback({ success: true, playerIndex: existing.index, opponentOnline, hasState: room.state !== null });
      socket.to(data.roomId).emit('player_reconnected', { playerIndex: existing.index });
      if (room.state) {
        socket.emit('restore_state', room.state);
      }
      broadcastRoomList();
      return;
    }

    // Verificar senha
    if (room.password !== null) {
      if (!data.password || data.password !== room.password) {
        callback({ success: false, error: 'Senha incorreta' });
        return;
      }
    }

    // Encontrar slot vazio (pode ser 0 se host saiu, ou 1 se é o segundo jogador)
    let freeSlot: 0 | 1 | null = null;
    if (room.players[0] === null) freeSlot = 0;
    else if (room.players[1] === null) freeSlot = 1;

    if (freeSlot === null) {
      callback({ success: false, error: 'Sala cheia' });
      return;
    }

    const joinerSlot: PlayerSlot = {
      playerId: data.playerId,
      socketId: socket.id,
      deck: null,
      ready: false,
      name: data.playerName || `Jogador ${freeSlot + 1}`,
    };

    room.players[freeSlot] = joinerSlot;
    if (room.players[0] !== null && room.players[1] !== null) {
      room.status = 'selecting';
    }
    playerRoomMap.set(data.playerId, data.roomId);
    socket.join(data.roomId);
    cancelDestroyTimer(room);

    const opponentIdx = freeSlot === 0 ? 1 : 0;
    const opponentOnline = isPlayerOnline(room.players[opponentIdx]);

    console.log(`Player ${data.playerName} joined room ${data.roomId} as player ${freeSlot}`);
    callback({ success: true, playerIndex: freeSlot, opponentOnline });

    socket.to(data.roomId).emit('player_joined', { playerName: joinerSlot.name });
    broadcastRoomList();
  });

  // ── Reconectar à sala ───────────────────────────────────
  socket.on('rejoin_room', (data: { playerId: string }, callback: (res: { success: boolean; roomId?: string; playerIndex?: number; hasState?: boolean; opponentOnline?: boolean }) => void) => {
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

    found.slot.socketId = socket.id;
    socket.join(roomId);
    cancelDestroyTimer(room);

    const opponentIdx = found.index === 0 ? 1 : 0;
    const opponentOnline = isPlayerOnline(room.players[opponentIdx]);

    console.log(`Player ${found.slot.name} rejoined room ${roomId}`);
    callback({
      success: true,
      roomId,
      playerIndex: found.index,
      hasState: room.state !== null,
      opponentOnline,
    });

    if (room.state) {
      socket.emit('restore_state', room.state);
    }

    socket.to(roomId).emit('player_reconnected', { playerIndex: found.index });
    broadcastRoomList();
  });

  // ── Sair da sala (intencional — voltar ao lobby) ────────
  socket.on('leave_room', (data: { roomId: string }, callback?: (res: { success: boolean }) => void) => {
    const room = rooms.get(data.roomId);
    if (!room) { callback?.({ success: false }); return; }

    const found = findPlayerInRoom(room, findRoomBySocketId(socket.id)?.slot.playerId ?? '');
    if (!found) { callback?.({ success: false }); return; }

    const { index } = found;
    socket.leave(data.roomId);

    if (room.status === 'playing') {
      // ── Jogo em andamento: mesa persiste, slot mantido ──
      // Só desconecta o socket, mas o slot (e o state) ficam preservados.
      // Jogador pode voltar pelo lobby clicando na sala.
      found.slot.socketId = null;
      playerRoomMap.delete(found.slot.playerId);
      socket.to(data.roomId).emit('player_disconnected', { playerIndex: index });

      // Se ambos offline, agendar destruição (5 min)
      const anyOnline = room.players.some(p => isPlayerOnline(p));
      if (!anyOnline) {
        scheduleRoomDestroy(data.roomId);
      }
    } else {
      // ── Sala em espera/seleção: remover slot de verdade ──
      room.players[index] = null as unknown as typeof room.players[0];
      playerRoomMap.delete(found.slot.playerId);

      if (room.status === 'selecting') {
        room.status = 'waiting';
      }

      socket.to(data.roomId).emit('player_disconnected', { playerIndex: index });

      // Se ninguém sobrou, destruir imediatamente
      const anyPlayer = room.players.some(p => p !== null);
      if (!anyPlayer) {
        cancelDestroyTimer(room);
        for (const p of room.players) {
          if (p) playerRoomMap.delete(p.playerId);
        }
        rooms.delete(data.roomId);
        console.log(`Room ${data.roomId} destroyed (empty, not in game)`);
      }
    }

    broadcastRoomList();
    console.log(`Player ${found.slot.name} left room ${data.roomId} intentionally`);
    callback?.({ success: true });
  });

  // ── Destruir sala (kick ambos) ─────────────────────────
  socket.on('destroy_room', (data: { roomId: string }, callback?: (res: { success: boolean }) => void) => {
    const room = rooms.get(data.roomId);
    if (!room) { callback?.({ success: false }); return; }

    // Verificar se quem pediu está na sala
    const found = findRoomBySocketId(socket.id);
    if (!found || found.roomId !== data.roomId) { callback?.({ success: false }); return; }

    cancelDestroyTimer(room);

    // Notificar todos na sala (incluindo quem pediu)
    io.in(data.roomId).emit('room_destroyed');

    // Limpar tudo
    for (const p of room.players) {
      if (p) playerRoomMap.delete(p.playerId);
    }
    rooms.delete(data.roomId);

    broadcastRoomList();
    console.log(`Room ${data.roomId} destroyed by ${found.slot.name}`);
    callback?.({ success: true });
  });

  // ── Enviar deck ─────────────────────────────────────────
  socket.on('submit_deck', (data: { roomId: string; deck: unknown[] }) => {
    const room = rooms.get(data.roomId);
    if (!room) return;

    const found = findRoomBySocketId(socket.id);
    if (!found || found.roomId !== data.roomId) return;

    found.slot.deck = data.deck;
    found.slot.ready = true;

    console.log(`Player ${found.index} submitted deck in room ${data.roomId}`);

    const p0 = room.players[0];
    const p1 = room.players[1];
    if (p0 && p1 && p0.ready && p1.ready) {
      room.status = 'playing';
      io.in(data.roomId).emit('both_ready', {
        decks: [p0.deck, p1.deck],
      });
      broadcastRoomList();
      console.log(`Both players ready in room ${data.roomId} — starting game`);
    }
  });

  // ── Sync state ──────────────────────────────────────────
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
    slot.socketId = null;

    socket.to(roomId).emit('player_disconnected', { playerIndex: index });

    const anyOnline = room.players.some(p => isPlayerOnline(p));
    if (!anyOnline) {
      scheduleRoomDestroy(roomId);
    }

    broadcastRoomList();
    console.log(`Player ${slot.name} (index ${index}) went offline in room ${roomId}`);
  });
});

// ============================================================
// Start
// ============================================================

const PORT = parseInt(process.env.PORT || '3002', 10);
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Pocket TCG Server rodando na porta ${PORT}`);
});
