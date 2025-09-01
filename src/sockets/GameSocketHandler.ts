// src/sockets/GameSocketHandler.ts
import { Server, Socket } from "socket.io";
import { GameService } from "../services/gameService";
import { GameAndPlayerID } from "../models/types";

export class GameSocketHandler {

  constructor(private io: Server, private gameService: GameService) { }

  public registerHandlers(socket: Socket) {
    const { playerId, gameId } = socket;

    // JOIN GAME
    socket.on("joinGame", () => {
      const joinData = this.gameService.getJoinGameData(gameId, playerId);
      // if (joinData?.error) {
      //   socket.emit("error", joinData.error);
      //   return;
      // }
      socket.join(gameId);
      socket.emit('joinedGame', {
        board: joinData.board,
        color: joinData.color,
        turn: joinData.turn,
        status: joinData.status
      });
      socket.to(gameId).emit('roomJoinMessage', { playerName: joinData.playerName });
      if (joinData.players?.filter(p => p.isOnline).length === 2) {
        this.gameService.setGameStatus(gameId, 'playing');
        this.io.to(gameId).emit('gameUpdate', {
          board: joinData.board,
          turn: joinData.turn,
          status: 'playing',
          message: 'Game started! Both players are connected.'
        });
      } else if (joinData.status === 'waiting') {
        this.io.to(gameId).emit('gameUpdate', {
          status: joinData.status,
          players: joinData.players,
          message: 'Waiting for opponent to connect.'
        });
      }
    });

    // MAKE MOVE
    socket.on("makeMove", async ({ from, to, promotionType }) => {
      if (this.gameService.getGameStatus(gameId) !== "playing") {
        socket.emit('moveError', { message: 'O jogador inimigo ainda não entrou' });
        return;
      }
      const moveResult = await this.gameService.makeMove(gameId, playerId, from, to, promotionType);
      if (moveResult?.success) {
        const boardUpdate = this.gameService.getBoardUpdateData(gameId);
        this.io.to(gameId).emit('boardUpdate', boardUpdate);
        if (moveResult.winner) {
          const gameOverData = this.gameService.getGameOverData(gameId, playerId);
          this.io.to(gameId).emit('gameOver', gameOverData);
        } else if (moveResult.status === 'checkmate') {
          const gameOverData = this.gameService.getGameOverData(gameId, playerId, "Cheque mate");
          this.io.to(gameId).emit('gameOver', gameOverData);
        }
      } else {
        socket.emit('moveError', { message: 'Invalid move.' });
      }
    });

    // DISCONNECT
    socket.on("disconnect", () => {
      console.log(`Socket ${socket.id} desconectou`);
      const gameAndPlayerId: GameAndPlayerID = { gameId, playerId };
      this.gameService.handlePlayerDisconnect(gameAndPlayerId, (gameId, playerId) => {
        const gamePlayer = this.gameService.getGamePlayerById(gameId, playerId);
        if (gamePlayer) {
          this.gameService.setGameStatus(gameId, 'ended');
          this.io.to(gameId).emit('gameOver', {
            status: 'abandoned',
            playerWinner: gamePlayer.getPlayerName(),
            message: `${gamePlayer.getPlayerName()} não se reconectou a tempo`
          });
        } else {
          this.gameService.setGameStatus(gameId, 'abandoned');
          this.io.to(gameId).emit('gameAbandoned', { message: 'Game abandoned due to unresolved disconnection.' });
        }
        this.gameService.deleteGame(gameId);
      });
    });
  }
}
