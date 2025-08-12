import { Player } from './Player';
import { PieceColor } from '../models/types';

export class GamePlayer {
  public readonly player: Player;
  public color: PieceColor;
  public isOnline: boolean;
  public disconnectedAt?: number;

  constructor(player: Player, color: PieceColor) {
    this.player = player;
    this.color = color;
    this.isOnline = true;
  }

  getPlayerId(): string {
    return this.player.getPlayerId();
  }

  getPlayerName(): string {
    return this.player.getPlayerName();
  }
}