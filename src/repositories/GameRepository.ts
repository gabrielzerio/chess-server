// src/repositories/GameRepository.ts
import { Game } from "../class/game";

export class GameRepository {
  private games: { [key: string]: Game } = {};

  // Adiciona um novo jogo ao repositório
  public add(gameId: string, game: Game): void {
    this.games[gameId] = game;
  }

  // Remove um jogo do repositório
  public remove(gameId: string): void {
    console.log(`jogo ${gameId} foi removido!`);
    
    delete this.games[gameId];
  }

  // Busca um jogo pelo ID
  public get(gameId: string): Game {
    return this.games[gameId];
  }

  // Busca todos os jogos
  public getAll(): Game[] {
    return Object.values(this.games);
  }
}