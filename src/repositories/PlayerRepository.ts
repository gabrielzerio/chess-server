// src/repositories/PlayerRepository.ts
import { Player } from "../class/Player";

export class PlayerRepository {
  private players: { [id: string]: Player } = {};

  // Adiciona um jogador
  public add(player: Player){
    this.players[player.getPlayerId()] = player;
  }

  // Remove um jogador
  remove(playerId: string) {
    delete this.players[playerId];
  }

  // Busca um jogador pelo ID
  getById(playerId: string): Player | null {
    return this.players[playerId];
  }

  // Busca todos os jogadores
  getAll(): Player[] {
    return Object.values(this.players);
  }
}