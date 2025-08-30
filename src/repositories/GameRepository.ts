// src/repositories/GameRepository.ts
import { Game } from "../class/game";
import { Player } from "../class/Player";

export class GameRepository {
  private games: { [key: string]: Game } = {};

  // Adiciona um novo jogo ao repositório
  public add(gameId: string, game: Game): void {
    this.games[gameId] = game;
  }

  // Remove um jogo do repositório
  public remove(gameId: string): void {
    delete this.games[gameId];
  }

  // Busca um jogo pelo ID
  public get(gameId: string): Game | null {
    return this.games[gameId] || null;
  }

  // Busca todos os jogos
  public getAll(): Game[] {
    return Object.values(this.games);
  }
}