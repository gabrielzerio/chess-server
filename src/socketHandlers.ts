import { Server, Socket } from 'socket.io';
import { games } from './gameStore'; // ou de onde você exportar o objeto de jogos

export function registerSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    // Coloque aqui os handlers de join, move, disconnect, etc.
  });
}