// src/sockets/GameSocketHandler.ts
import { Server, Socket } from "socket.io";
import { GameService } from "../services/gameService";
import { GameAndPlayerID, Position } from "../models/types";
import { PlayerService } from "../services/playerService";

export class GameSocketHandler {

  constructor(private io: Server, private gameService: GameService, private playerService: PlayerService) { }
  private emitTimer(gameId: string, gamePlayerId: string) {
    this.gameService.setTimer(gameId, gamePlayerId);
    const timers = this.gameService.getTimersByGame(gameId);
    this.io.to(gameId).emit("updateTimer", timers);
  }
  private async startTimer(gameId: string) {
    if (this.gameService.getGameStatus(gameId) === "first_movement") {
      this.gameService.setGameStatus(gameId, 'playing');
    }
    const finish = await this.gameService.startGameTimers(gameId, 10000); // 5 min
    if (finish) {
      this.emitGameOver(gameId, 'O tempo de ');
    }

  }
  private emitGameOver(gameId: string, message?: string) {
    const gameOver = this.gameService.getGameOverData(gameId);
    this.io.to(gameId).emit('gameOver', gameOver, message);
  }
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
      if (joinData.players === 2) {
        this.gameService.setGameStatus(gameId, 'first_movement');
        this.io.to(gameId).emit('gameUpdate', {
          board: joinData.board,
          turn: joinData.turn,
          status: this.gameService.getGameStatus(gameId),
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

    socket.on('requestPossibleMoves', async (from: Position, callback) => {
      if (this.gameService.getGameStatus(gameId) === "waiting") {
        socket.emit('moveError', { message: 'O jogador inimigo ainda não entrou' });
        return;
      }
      const possibleMoves = this.gameService.getPossibleMoves(from, { gameId: gameId, playerId: playerId });
      if (possibleMoves) {
        callback({ normalMoves: possibleMoves.normalMoves, captureMoves: possibleMoves.captureMoves }); //aqui vou colocar todos os dados que quero devolver para a 'requisição
      }
    })


    // MAKE MOVE
    socket.on("makeMove", async ({ from, to, promotionType }) => {
      if (this.gameService.getGameStatus(gameId) === "waiting") {
        socket.emit('moveError', { message: 'O jogador inimigo ainda não entrou' });
        return;
      }
      const moveResult = await this.gameService.makeMove(gameId, playerId, from, to, promotionType);
      if (moveResult?.success) {
        if (this.gameService.getGameStatus(gameId) === "first_movement") {
          this.startTimer(gameId);
        }
        this.emitTimer(gameId, playerId);
        const boardUpdate = this.gameService.getBoardUpdateData(gameId);
        this.io.to(gameId).emit('boardUpdate', boardUpdate);

        if (moveResult.winner) {
          this.emitGameOver(gameId);
        } else if (moveResult.status === 'checkmate') {
          this.emitGameOver(gameId);
        }
      } else {
        socket.emit('moveError', { message: 'Invalid move.' });
      }
    });



    // DISCONNECT
    // ... imports
    socket.on("disconnect", async () => { // O handler do evento agora é ASYNC
      console.log(`Socket ${socket.id} desconectou`);

      // if (!gameId || !playerId) {
      //   return; // Sai se não houver informações do jogo/jogador
      // }

      const gamePlayer = this.gameService.getGamePlayerById(gameId, playerId);

      // 1. Emite imediatamente que o jogo está pausado
      this.io.to(gameId).emit('gamePausedForReconnect', {
        disconnectedPlayerName: gamePlayer?.getPlayerName(),
        gameStatus: 'paused_reconnect',
        timeLeft: 600000 // Envia o tempo total em segundos
      });

      // 2. Chama o serviço e AGUARDA (await) o resultado do timeout
      const gameAndPlayerId: GameAndPlayerID = { gameId, playerId };
      try {
        const gameOverData = await this.gameService.handlePlayerDisconnect(gameAndPlayerId);
        if (gameOverData) {
          console.log('Tempo de reconexão esgotado. Encerrando o jogo.');
          this.io.to(gameId).emit('gameOver', gameOverData);
        } else {
          // Se for nulo, o jogador se reconectou a tempo ou o jogo terminou por outro motivo
          console.log('O jogador se reconectou ou a pausa foi resolvida.');
        }
        // this.io.disconnectSockets();

      }
      catch (error) {
        console.log(error);
      }

      // 3. Se gameOverData não for nulo, significa que o tempo esgotou e o jogo acabou

    });
  }
}
