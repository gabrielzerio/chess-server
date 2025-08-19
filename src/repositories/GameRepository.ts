// repositories/GameRepository.ts
import { Game } from '../class/game';

export class GameRepository {
  private games: Record<string, Game> = {};

  get(gameId: string): Game | null {
    return this.games[gameId] || null;
  }

  save(gameId: string, game: Game): void {
    this.games[gameId] = game;
  }

  delete(gameId: string): boolean {
    if (this.games[gameId]) {
      delete this.games[gameId];
      return true;
    }
    return false;
  }

  exists(gameId: string): boolean {
    return !!this.games[gameId];
  }
}
