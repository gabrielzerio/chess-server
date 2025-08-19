// controllers/GameSocketHandler.ts
import { Server, Socket } from 'socket.io';
import { GameService } from '../services/GameService';

export class GameSocketHandler {
  constructor(private io: Server, private service: GameService) {
    this.setupListeners();
  }

  private setupListeners() {
    this.service.on('gameCreated', data =>
      this.io.in(data.gameId).emit('gameCreated', data)
    );

    this.service.on('playerAdded', data =>
      this.io.in(data.gameId).emit('playerJoined', data)
    );

    this.service.on('moveMade', data =>
      this.io.in(data.gameId).emit('boardUpdate', data.result)
    );
  }

  public handleConnection(socket: Socket) {
    socket.on('createGame', () => {
      const gameId = this.service.createGame(socket.playerId);
      socket.emit('gameCreated', { gameId });
    });

    socket.on('joinGame', ({ gameId, playerName }) => {
      try {
        this.service.addPlayer(gameId, /* instancia Player */);
      } catch (err) {
        socket.emit('joinError', { message: err.message });
      }
    });

    socket.on('makeMove', (data) => {
      try {
        this.service.makeMove(socket.gameID, socket.playerId, data.from, data.to, data.promotionType);
      } catch (err) {
        socket.emit('moveError', { message: err.message });
      }
    });

    // demais handlers...
  }
}
