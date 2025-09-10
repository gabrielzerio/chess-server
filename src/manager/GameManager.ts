import { Position, PieceType, PieceColor, GameStatus, Board, ApplyMoveResult, DisconnectResult } from "../models/types";

// ...existing code...
// src/managers/GameManager.ts
import { Game } from "../class/game";
import { Player } from "../class/Player";
import { GamePlayer } from "../class/GamePlayer";

export class GameManager {
  private playerTimers: Map<string, Map<string, number>> = new Map();
  private activeTimers: Map<string, NodeJS.Timeout> = new Map();
  private timerIntervalMs = 1000; // 1 segundo
  private reconnectionTimers: Map<string, { timer: NodeJS.Timeout, resolve: (value: DisconnectResult | null) => void }> = new Map();
  private timerCallbacks: Map<string, (gameId: string, playerId: string) => void> = new Map();

  startGameTimers(
    gameId: string,
    playerIds: string[],
    initialTimeMs: number,
    onTimeout?: (gameId: string, playerId: string) => void
  ) {
    const timers = new Map<string, number>();
    playerIds.forEach(id => timers.set(id, initialTimeMs));

    this.playerTimers.set(gameId, timers);

    if (onTimeout) {
      this.timerCallbacks.set(gameId, onTimeout);
    }

    // Começa o timer do primeiro jogador
    this.startPlayerTimer(gameId, playerIds[0], onTimeout);
  }

  startPlayerTimer(
    gameId: string,
    playerId: string,
    onTimeout?: (gameId: string, playerId: string) => void
  ) {
    this.clearActiveTimer(gameId);
    const callback = onTimeout || this.timerCallbacks.get(gameId);

    const interval = setInterval(() => {
      const timers = this.playerTimers.get(gameId);
      if (!timers) return;

      const current = timers.get(playerId);
      if (current === undefined) return;

      timers.set(playerId, current - this.timerIntervalMs);

      if (current <= 0) {
        if (callback) {
          callback(gameId, playerId);
        }
        this.clearActiveTimer(gameId);
      }
    }, this.timerIntervalMs);

    this.activeTimers.set(gameId, interval);
  }


  clearActiveTimer(gameId: string) {
    const timer = this.activeTimers.get(gameId);
    if (timer) clearInterval(timer);
    this.activeTimers.delete(gameId);
  }


  switchTurn(gameId: string, gamePlayerId: string) {
    this.startPlayerTimer(gameId, gamePlayerId, this.timerCallbacks.get(gameId));
  }

  getTimer(gameId: string): Map<string, number> | undefined {
    return this.playerTimers.get(gameId);
  }


  // Orquestra uma jogada: recupera o jogo, valida o player e chama applyMove
  getPossibleMoves(game: Game, from: Position): { normalMoves: Position[], captureMoves: Position[] } | null {
    const piece = game.getSelectedPiece(from);
    if (piece) {
      const possibleMoves = game.possibleMoves(piece);
      return possibleMoves;
    }
    return null;
  }

  async makeMove(game: Game, player: GamePlayer, from: Position, to: Position, promotionType?: PieceType): Promise<ApplyMoveResult> {
    if (!game) {
      return { success: false, message: 'Game not found.' };
    }
    if (!player) {
      return { success: false, message: 'Player not found.' };
    }
    // Chama a lógica do tabuleiro
    const newState = await game.applyMove(player, from, to, promotionType);

    return newState;
  }

  // private getFen(gameId: string): string {
  //   // --- Calcula FEN atualizado ---
  //   const game = this.getGame(gameId);
  //   const castlingRights = game.getCastlingRights();
  //   const turn = game.getTurn();
  //   const enPassantTarget = game.getEnPassantTarget();
  //   const { halfMove, fullMove } = game.getFullAndHalfMove();
  //   const board = game.deserializeBoard();
  //   const fen = boardToFEN(board, {
  //     turn: turn,
  //     castling: castlingRights,
  //     enPassant: enPassantTarget
  //       ? `${String.fromCharCode(97 + enPassantTarget.col)}${8 - enPassantTarget.row}`
  //       : '-',
  //     halfmove: halfMove,
  //     fullmove: fullMove
  //   });
  //   return fen
  // }
  // Retorna o status do jogo
  getGameStatus(game: Game): GameStatus {
    return game?.getStatus();
  }

  // Define o status do jogo
  setGameStatus(game: Game, status: GameStatus): void {
    if (game) {
      game.setStatus(status);
    }
  }


  /**
   * Coloca o jogo em pausa e inicia o timer de reconexão para o player
   */
  // setReconnectionTimer(game: Game, playerId: string, timeoutMs: number = 60000) {
  //   if (!game) return;
  //   // Pausa o jogo
  //   game.setStatus('paused_reconnect');

  //   // Cria o timer
  //   const timer = setTimeout(() => {
  //     console.log('tempo ', timer)
  //     // Se o player ainda está offline após o timeout, encerra o jogo
  //     const stillOffline = !game.getGamePlayerById(playerId)?.getStatus();
  //     if (stillOffline) {
  //       game.setStatus('ended');
  //       // Aqui você pode emitir eventos, remover o jogo, etc.
  //     }
  //     this.clearReconnectionTimer(playerId);
  //   }, timeoutMs);
  //   this.setReconnectionTimerInternal(playerId, timer);
  // }

  // ...existing code...

  // Retorna o turno do jogo
  getGameTurn(game: Game): PieceColor {
    const turn = game.getTurn();
    return turn;
  }

  getGamePlayersAtGame(game: Game): GamePlayer[] {
    return game.getAllGamePlayers();
  }

  getWinner(game: Game): GamePlayer | undefined {
    return game.getWinner();
  }
  // setWinner(game: Game, gamePlayer: GamePlayer): GamePlayer {
  //   return game.setWinner(gamePlayer);
  // }

  // Cria um novo jogo
  createGame(gameId: string, board: any): Game {
    const newGame = new Game(board);
    // Adiciona jogador ao repositório
    // this.playerRepository.add(player);
    // Adiciona jogo ao repositório
    // this.gameRepository.add(gameId, newGame);
    // Cria um novo historico
    // this.notationManager.createGame(gameId);
    // console.log(this.notationManager.getPGN(gameId));
    return newGame;
  }

  // Adiciona player em jogo existente
  addPlayerToGame(game: Game, player: Player): GamePlayer | null {
    if (!game) return null;
    const gamePlayer = new GamePlayer(player, this.setColorForPlayer(game));
    game.addGamePlayer(gamePlayer);
    return gamePlayer;
  }

  private setColorForPlayer(game: Game): PieceColor {
    const qtd = game.countPlayersInGame();
    return qtd == 0 ? "white" : "black";
  }

  gameExists(game: Game): boolean {
    if (game) return true;
    return false;
  }

  getBoard(game: Game): Board {
    return game.serializeBoard();
  }


  getPlayerStatus(game: Game, playerId: string): boolean {
    return game.getGamePlayerById(playerId)?.getStatus();
  }

  // Marca o status online/offline do jogador
  setPlayerOnlineStatus(game: Game, playerId: string, isOnline: boolean): GamePlayer | null {
    if (!game) return null;
    const gamePlayer = game.getGamePlayerById(playerId);
    if (gamePlayer) {
      gamePlayer.setStatus(isOnline);
    }
    return gamePlayer
  }

  // Retorna número de jogadores online
  getPlayersInGame(game: Game): number {
    if (!game) return 0;
    return game.getAllGamePlayers().filter(p => p.getStatus()).length;
  }

  // Lógica de reconexão: pausa o jogo e inicia timer
  handlePlayerDisconnect(
    game: Game,
    playerId: string,
    onTimeout: (game: Game, playerId: string) => DisconnectResult,
    timeoutMs: number = 60000
  ): Promise<DisconnectResult | null> {

    return new Promise((resolve) => {
      this.setPlayerOnlineStatus(game, playerId, false);
      const playersOnline = this.getGamePlayersAtGame(game).filter(p => p.isOnline).length;

      if (this.getGameStatus(game) === 'playing' || this.getGameStatus(game) === 'first_movement' && playersOnline < 2) {
        this.setGameStatus(game, 'paused_reconnect');

        const timer = setTimeout(() => {
          // Verifica novamente o estado do jogo e dos jogadores ANTES de executar o callback
          const gamePlayer = game.getGamePlayerById(playerId);

          // Se o jogador não se reconectou e o jogo ainda está pausado
          if (gamePlayer && !gamePlayer.isOnline && this.getGameStatus(game) === 'paused_reconnect') {
            const result = onTimeout(game, playerId); // Executa o callback
            resolve(result); // Resolve a Promise com o resultado do callback
          } else {
            // O jogador se reconectou ou o estado do jogo mudou, então não fazemos nada
            resolve(null);
          }
          this.reconnectionTimers.delete(playerId);
        }, timeoutMs);

        // Armazena tanto o timer quanto a função resolve para poder cancelá-lo depois
        this.reconnectionTimers.set(playerId, { timer, resolve });
      } else {
        // Se o jogo não estava em andamento ou se ainda há jogadores suficientes, não faz nada.
        resolve(null);
      }
    });
  }

  // Método para ser chamado quando um jogador se reconecta
  handlePlayerReconnect(playerId: string) {
    if (this.reconnectionTimers.has(playerId)) {
      const { timer, resolve } = this.reconnectionTimers.get(playerId)!;
      clearTimeout(timer); // Cancela o timeout
      resolve(null); // Resolve a promise com null, indicando que o jogo não deve acabar
      this.reconnectionTimers.delete(playerId);
    }
  }

  // Lida com reconexão (utilitário interno)
  // private setReconnectionTimerInternal(playerId: string, timeout: NodeJS.Timeout) {
  //   this.reconnectionTimers.set(playerId, timeout);
  // }

  // private clearReconnectionTimer(playerId: string) {
  //   const timer = this.reconnectionTimers.get(playerId);
  //   if (timer) clearTimeout(timer);
  //   this.reconnectionTimers.delete(playerId);
  // }
  // Removido chave extra
}
