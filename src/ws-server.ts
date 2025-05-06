import { createServer } from 'http';
import { Server } from 'socket.io';

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

const games: Record<string, Set<string>> = {};

io.on('connection', (socket) => {
  socket.on('join', (gameId: string) => {
    socket.join(gameId);
    if (!games[gameId]) games[gameId] = new Set();
    games[gameId].add(socket.id);
    socket.data.gameId = gameId;
  });

  socket.on('move', ({ gameId, move }) => {
    // Envia para todos os outros jogadores na sala
    socket.to(gameId).emit('move', { move });
  });

  socket.on('disconnect', () => {
    const gameId = socket.data.gameId;
    if (gameId && games[gameId]) {
      games[gameId].delete(socket.id);
      if (games[gameId].size === 0) delete games[gameId];
    }
  });
});

httpServer.listen(3002, () => {
  console.log('Socket.IO server rodando na porta 3002');
});
