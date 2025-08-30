import { Position, PieceType, PieceColor } from "../models/types";

// ...existing code...
// src/managers/GameManager.ts
import { Game } from "../class/game";
import { Player } from "../class/Player";
import { GamePlayer } from "../class/GamePlayer";
import { GameRepository } from "../repositories/GameRepository";
import { PlayerRepository } from "../repositories/PlayerRepository";

export class GameManager {
  // Orquestra uma jogada: recupera o jogo, valida o player e chama applyMove
  async makeMove(gameId: string, playerId: string, from: Position, to: Position, promotionType?: PieceType) {
    const game = this.getGame(gameId);
    if (!game) {
      return { success: false, message: 'Game not found.' };
    }
    const player = this.getPlayerById(playerId);
    if (!player) {
      return { success: false, message: 'Player not found.' };
    }
    // Chama a lógica do tabuleiro
    return await game.applyMove(player, from, to, promotionType);
  }
  // Retorna o status do jogo
  getGameStatus(gameId: string): string | undefined {
    const game = this.getGame(gameId);
    return game ? (game as any).status : undefined;
  }

  // Define o status do jogo
  setGameStatus(gameId: string, status: string): void {
    const game = this.getGame(gameId);
    if (game) (game as any).status = status;
  }

  // Retorna o turno do jogo
  getGameTurn(gameId: string): string | undefined {
    const game = this.getGame(gameId);
    return game ? (game as any).turn : undefined;
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

  getGamePlayerById(playerId: string): GamePlayer | undefined {
    return this.gamePlayerRepository.getById(playerId);
  }

  getAllGamePlayers(): GamePlayer[] {
    return this.gamePlayerRepository.getAll();
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
    const game = this.gameRepository.get(gameId);
    if (!game) return null;
    const gamePlayer = new GamePlayer(player, this.setColorForPlayer(game));
    game.addGamePlayer(gamePlayer);
    return gamePlayer;
  }

  private setColorForPlayer(game:Game): PieceColor{
    const qtd = game.countPlayersInGame();
    return qtd == 0 ? "white" : "black";
  }

  // Remove um jogo
  deleteGame(gameId: string): boolean {
    this.gameRepository.remove(gameId);
    return true;
  }

  // Busca jogo
  getGame(gameId: string): Game | null {
    return this.gameRepository.get(gameId);
  }

  // Busca player
  getPlayerById(playerId: string): Player | null {
    return this.playerRepository.getById(playerId) ?? null;
  }

  getPlayerByName(name: string): Player | null {
    const allPlayers: Player[] = this.playerRepository.getAll();
    return allPlayers.find((p: Player) => p.getPlayerName() === name) || null;
  }

  // Lida com reconexão
  setReconnectionTimer(playerId: string, timeout: NodeJS.Timeout) {
    this.reconnectionTimers.set(playerId, timeout);
  }

  clearReconnectionTimer(playerId: string) {
    const timer = this.reconnectionTimers.get(playerId);
    if (timer) clearTimeout(timer);
    this.reconnectionTimers.delete(playerId);
  }
  // Removido chave extra
}
