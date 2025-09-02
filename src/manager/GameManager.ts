import { Position, PieceType, PieceColor, GameStatus, GameAndPlayerID, Board } from "../models/types";

// ...existing code...
// src/managers/GameManager.ts
import { Game } from "../class/game";
import { Player } from "../class/Player";
import { GamePlayer } from "../class/GamePlayer";
import { GameRepository } from "../repositories/GameRepository";
import { PlayerRepository } from "../repositories/PlayerRepository";

export class GameManager {
  private playerTimers: Map<string, { white: number, black: number }> = new Map();
  private activeTimers: Map<string, NodeJS.Timeout> = new Map();
  private timerIntervalMs = 1000; // 1 segundo

  startGameTimers(gameId: string, initialTimeMs: number) {
    this.playerTimers.set(gameId, { white: initialTimeMs, black: initialTimeMs });
    this.startPlayerTimer(gameId, 'white');
  }

  startPlayerTimer(gameId: string, color: 'white' | 'black') {
    this.clearActiveTimer(gameId);

    const interval = setInterval(() => {
      const timers = this.playerTimers.get(gameId);
      if (!timers) return;

      timers[color] -= this.timerIntervalMs;

      if (timers[color] <= 0) {
        this.endGameByTimeout(gameId, color);
        this.clearActiveTimer(gameId);
      }
    }, this.timerIntervalMs);

    this.activeTimers.set(gameId, interval);
  }

  getPlayerTimer(){
    return this.playerTimers;
  }
  
  clearActiveTimer(gameId: string) {
    const timer = this.activeTimers.get(gameId);
    if (timer) clearInterval(timer);
    this.activeTimers.delete(gameId);
  }

  endGameByTimeout(gameId: string, loserColor: 'white' | 'black') {
    // Lógica para finalizar o jogo e declarar o vencedor
    // Exemplo: this.setGameStatus(gameId, 'ended');
    // Emitir evento para sockets, etc.
  }

  switchTurn(gameId: string, currentColor: 'white' | 'black') {
    const nextColor = currentColor === 'white' ? 'black' : 'white';
    this.startPlayerTimer(gameId, nextColor);
  }

  getTimer(gameId: string): { white: number; black: number } | undefined {
    const timers = this.playerTimers.get(gameId);
    return timers;
  }

  // Orquestra uma jogada: recupera o jogo, valida o player e chama applyMove
  getPossibleMoves(from: Position, gameAndPlayerId: GameAndPlayerID): { normalMoves: Position[], captureMoves: Position[] } | null {
    const { gameId, playerId } = gameAndPlayerId;
    const game = this.getGame(gameId)
    const piece = game.getSelectedPiece(from);
    if (piece) {
      const possibleMoves = game.possibleMoves(piece);
      return possibleMoves;
    }
    return null;
  }

  async makeMove(gameId: string, playerId: string, from: Position, to: Position, promotionType?: PieceType) {
    const game = this.getGame(gameId);
    if (!game) {
      return { success: false, message: 'Game not found.' };
    }
    const player = this.getGamePlayerById(playerId, gameId);
    if (!player) {
      return { success: false, message: 'Player not found.' };
    }
    // Chama a lógica do tabuleiro
    return await game.applyMove(player, from, to, promotionType);
  }
  // Retorna o status do jogo
  getGameStatus(gameId: string): GameStatus {
    const game = this.getGame(gameId);
    return game?.getStatus();
  }

  // Define o status do jogo
  setGameStatus(gameId: string, status: GameStatus): void {
    const game = this.getGame(gameId);
    if (game) {
      game.setStatus(status);
    }
  }

  /**
   * Coloca o jogo em pausa e inicia o timer de reconexão para o player
   */
  setReconnectionTimer(gameAndPlayerId: GameAndPlayerID, timeoutMs: number = 60000) {
    const { gameId, playerId } = gameAndPlayerId;
    const game = this.getGame(gameId);
    if (!game) return;
    // Pausa o jogo
    this.setGameStatus(gameId, 'paused_reconnect');

    // Cria o timer
    const timer = setTimeout(() => {
      console.log('tempo ', timer)
      // Se o player ainda está offline após o timeout, encerra o jogo
      const stillOffline = !game.getGamePlayerById(playerId)?.getStatus();
      if (stillOffline) {
        this.setGameStatus(gameId, 'ended');
        // Aqui você pode emitir eventos, remover o jogo, etc.
      }
      this.clearReconnectionTimer(playerId);
    }, timeoutMs);
    this.setReconnectionTimerInternal(playerId, timer);
  }

  // ...existing code...

  // Retorna o turno do jogo
  getGameTurn(gameId: string): PieceColor {
    const game = this.getGame(gameId).getTurn();
    return game;
  }

  // Retorna o jogador do jogo
  getGamePlayer(gameId: string, playerId: string): any | undefined {
    // Supondo que GamePlayer está acessível via PlayerRepository
    const game = this.getGame(gameId);
    if (!game) return undefined;
    // Se gamePlayers estiver no PlayerRepository, buscar por lá
    // Aqui, apenas retorna o Player
    return this.getPlayerById(playerId);
  }
  private reconnectionTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private gameRepository: GameRepository,
    private playerRepository: PlayerRepository,
  ) { }
  // Adiciona GamePlayer
  // addGamePlayer(gamePlayer: GamePlayer) {
  //   this.gamePlayerRepository.add(gamePlayer);
  // }

  getGamePlayerById(playerId: string, gameId: string): GamePlayer | null {
    const game = this.getGame(gameId);
    if (!game) return null;
    const gamePlayer = game.getGamePlayerById(playerId);

    return gamePlayer

    // return null;
  }

  getGamePlayersAtGame(gameId: string): GamePlayer[] {
    return this.getGame(gameId).getAllGamePlayers();
  }

  // Cria um novo jogo
  createGame(gameId: string, board: any, player: Player): Game {
    const newGame = new Game(board);
    // Adiciona jogador ao repositório
    this.playerRepository.add(player);
    // Adiciona jogo ao repositório
    this.gameRepository.add(gameId, newGame);
    return newGame;
  }

  // Adiciona player em jogo existente
  addPlayerToGame(gameId: string, player: Player): GamePlayer | null {
    const game = this.getGame(gameId);
    if (!game) return null;
    const gamePlayer = new GamePlayer(player, this.setColorForPlayer(game));
    game.addGamePlayer(gamePlayer);
    return gamePlayer;
  }

  private setColorForPlayer(game: Game): PieceColor {
    const qtd = game.countPlayersInGame();
    return qtd == 0 ? "white" : "black";
  }

  // Remove um jogo
  deleteGame(gameId: string): boolean {
    this.gameRepository.remove(gameId);
    return true;
  }

  // Busca jogo
  private getGame(gameId: string): Game {
    return this.gameRepository.get(gameId);
  }
  gameExists(gameId: string): boolean {
    if (this.getGame(gameId)) return true;
    return false;
  }

  getBoard(gameId: string): Board {
    return this.getGame(gameId).serializeBoard();
  }

  // Busca player
  getPlayerById(playerId: string): Player | null {
    return this.playerRepository.getById(playerId) ?? null;
  }

  getPlayerByName(name: string): Player | null {
    const allPlayers: Player[] = this.playerRepository.getAll();
    return allPlayers.find((p: Player) => p.getPlayerName() === name) || null;
  }

  // applyMove(gameId: string, playerId: string, from: Position, to: Position, promotionType?: PieceType) {
  //   const game = this.getGame(gameId);
  //   const gamePlayer = game.getGamePlayerById(playerId);
  //   if (gamePlayer) {
  //     game.applyMove(gamePlayer, from, to, promotionType);
  //   }
  // }

  setPlayerStatus(gameAndPlayerId: GameAndPlayerID, status: boolean) {
    const { gameId, playerId } = gameAndPlayerId;
    const game = this.getGame(gameId);
    game.getGamePlayerById(playerId)?.setStatus(status);

  }

  getPlayerStatus(gameAndPlayerId: GameAndPlayerID): boolean {
    const { gameId, playerId } = gameAndPlayerId;
    const game = this.getGame(gameId);
    return game.getGamePlayerById(playerId)?.getStatus();
  }

  // Marca o status online/offline do jogador
  setPlayerOnlineStatus(gameId: string, playerId: string, isOnline: boolean) {
    const game = this.getGame(gameId);
    if (!game) return;
    const gamePlayer = game.getGamePlayerById(playerId);
    if (gamePlayer) {
      gamePlayer.setStatus(isOnline);
    }
  }

  // Retorna número de jogadores online
  getActivePlayersCount(gameId: string): number {
    const game = this.getGame(gameId);
    if (!game) return 0;
    return game.getAllGamePlayers().filter(p => p.getStatus()).length;
  }

  // Retorna todos os jogadores
  getPlayers(gameId: string) {
    const game = this.getGame(gameId);
    if (!game) return [];
    return game.getAllGamePlayers();
  }

  // Lógica de reconexão: pausa o jogo e inicia timer
  handlePlayerDisconnect(gameAndPlayerId: GameAndPlayerID, onTimeout: (gameId: string, playerId: string) => void, timeoutMs: number = 60000) {
    const { gameId, playerId } = gameAndPlayerId;
    this.setPlayerOnlineStatus(gameId, playerId, false);

    if (this.getGameStatus(gameId) === 'playing' && this.getActivePlayersCount(gameId) < 2) {
      this.setGameStatus(gameId, 'paused_reconnect');
      const timer = setTimeout(() => {
        // Se ainda está offline após timeout, encerra/abandona
        if (this.getActivePlayersCount(gameId) < 2 && this.getGameStatus(gameId) === 'paused_reconnect') {
          onTimeout(gameId, playerId);
        }
        this.clearReconnectionTimer(playerId);
      }, timeoutMs);
      this.setReconnectionTimerInternal(playerId, timer);
    }
    // Remove jogo se todos desconectaram
    if (this.getActivePlayersCount(gameId) < 1) {
      this.deleteGame(gameId);
    }
  }

  // Lógica de reconexão: jogador volta
  handlePlayerReconnect(gameId: string, playerId: string) {
    this.setPlayerOnlineStatus(gameId, playerId, true);
    this.clearReconnectionTimer(playerId);
    // Se ambos online, volta para playing
    if (this.getActivePlayersCount(gameId) === 2 && this.getGameStatus(gameId) !== 'playing') {
      this.setGameStatus(gameId, 'playing');
    }
  }

  // Lida com reconexão (utilitário interno)
  private setReconnectionTimerInternal(playerId: string, timeout: NodeJS.Timeout) {
    this.reconnectionTimers.set(playerId, timeout);
  }

  private clearReconnectionTimer(playerId: string) {
    const timer = this.reconnectionTimers.get(playerId);
    if (timer) clearTimeout(timer);
    this.reconnectionTimers.delete(playerId);
  }
  // Removido chave extra
}
