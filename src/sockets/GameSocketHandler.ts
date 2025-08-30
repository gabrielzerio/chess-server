// src/sockets/GameSocketHandler.ts
import { Server, Socket } from "socket.io";
import { Player } from "../class/Player";
import { createInitialBoard } from "../utils/boardSetup";
import { GameService } from "../services/gameService";

export class GameSocketHandler {
  private gameSvc: GameService;

  constructor(private io: Server, private gameService: GameService) {
    this.gameSvc = gameService;
  }

  public registerHandlers(socket: Socket) {

    // Entrar em jogo
    socket.on("joinGame", ({ gameId, playerName }: { gameId: string; playerName: string }) => {
      const player = new Player(playerName);
      const game = this.gameManager.addPlayerToGame(gameId, player);
      if (game) {
        socket.join(gameId);
        this.io.to(gameId).emit("gameUpdated", game);
      } else {
        socket.emit("error", "Não foi possível entrar no jogo.");
      }
    });

    // Fazer jogada
    socket.on("makeMove", async ({ gameId, from, to, promotionType }) => {
      const game = this.gameManager.getGame(gameId);
      if (!game) {
        socket.emit("error", "Jogo não encontrado.");
        return;
      }

      if (this.gameManager.getGameStatus(gameId) !== "playing") {
        socket.emit('moveError', { message: 'O jogador inimigo ainda não entrou' });
        return;
      }
      const piece = game.getSelectedPiece(from);
      if (!piece) return;

      const player = game.getPlayerByID(socket.playerId);
      if (!player) {
        socket.emit('moveError', { message: 'Jogador não encontrado' });
        return
      }

      const moveResult = await game.applyMove(player?.player, from, to, promotionType);
      // console.log(moveResult.message);
      if (moveResult.success) {
        this.io.to(socket.gameID).emit('boardUpdate', { board: moveResult.board, turn: moveResult.turn, status: moveResult.status });
        if (moveResult.winner) {
          this.io.to(socket.gameID).emit('gameOver', { winner: game.getTurn() === 'white' ? 'black' : 'white', status: moveResult.status, playerWinner: player?.getPlayerName() });
          // Considera remover o jogo se ele acabou
          // this.deleteGame(gameId); // Descomentar se quiser remover automaticamente
        } else if (moveResult.status === 'checkmate') {
          // Caso específico de xeque-mate sem winner direto no retorno, trate aqui
          this.io.to(socket.gameID).emit('gameOver', { winner: game.getTurn() === 'white' ? 'black' : 'white', message: "Cheque mate", status: moveResult.status, playerWinner: player?.getPlayerName() });
          // this.deleteGame(gameId);
        }
      } else {
        socket.emit('moveError', { message: 'Invalid move.' });
      }
    });

    // Sair do jogo
    socket.on("disconnect", () => {
      console.log(`Socket ${socket.id} desconectou`);
      // aqui você pode usar gameManager.clearReconnectionTimer(playerId) se quiser
    });
  }
}
