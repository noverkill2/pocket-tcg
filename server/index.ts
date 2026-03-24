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

interface Room {
  id: string;
  players: string[];
  state: unknown;
}

const rooms = new Map<string, Room>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Criar sala
  socket.on('create_room', (callback: (data: { roomId: string }) => void) => {
    let roomId = generateRoomCode();
    while (rooms.has(roomId)) roomId = generateRoomCode();

    const room: Room = { id: roomId, players: [socket.id], state: null };
    rooms.set(roomId, room);
    socket.join(roomId);

    console.log(`Room created: ${roomId} by ${socket.id}`);
    callback({ roomId });
  });

  // Entrar na sala
  socket.on('join_room', (roomId: string, callback: (data: { success: boolean; error?: string; playerIndex?: number }) => void) => {
    const room = rooms.get(roomId);
    if (!room) {
      callback({ success: false, error: 'Sala nao encontrada' });
      return;
    }
    if (room.players.length >= 2) {
      callback({ success: false, error: 'Sala cheia' });
      return;
    }

    room.players.push(socket.id);
    socket.join(roomId);

    console.log(`Player ${socket.id} joined room ${roomId}`);
    callback({ success: true, playerIndex: 1 });

    // Notificar o outro jogador
    socket.to(roomId).emit('player_joined');
  });

  // Sync de estado do jogo (relay simples)
  socket.on('game_action', (data: { roomId: string; action: string; payload: unknown }) => {
    socket.to(data.roomId).emit('game_action', { action: data.action, payload: data.payload });
  });

  // Sync de game state completo
  socket.on('sync_state', (data: { roomId: string; state: unknown }) => {
    const room = rooms.get(data.roomId);
    if (room) {
      room.state = data.state;
      socket.to(data.roomId).emit('sync_state', data.state);
    }
  });

  // Chat
  socket.on('chat_message', (data: { roomId: string; message: string; playerName: string }) => {
    io.in(data.roomId).emit('chat_message', { message: data.message, playerName: data.playerName, timestamp: Date.now() });
  });

  // Desconectar
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    for (const [roomId, room] of rooms) {
      const idx = room.players.indexOf(socket.id);
      if (idx !== -1) {
        room.players.splice(idx, 1);
        socket.to(roomId).emit('player_disconnected');
        if (room.players.length === 0) {
          rooms.delete(roomId);
          console.log(`Room ${roomId} deleted (empty)`);
        }
      }
    }
  });
});

const PORT = parseInt(process.env.PORT || '3002', 10);
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Pocket TCG Server rodando na porta ${PORT}`);
});
