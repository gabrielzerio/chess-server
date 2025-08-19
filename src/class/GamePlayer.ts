import { Player } from './Player';
import { PieceColor } from '../models/types';
import { IGamePlayer } from '../models/IGamePlayer';

export class GamePlayer implements IGamePlayer {
  public readonly player: Player;
  public color: PieceColor;
  public isOnline: boolean;
  public disconnectedAt?: number;

  constructor(player: Player, color: PieceColor) {
    this.player = player;
    this.color = color;
    this.isOnline = true;
  }

  get playerId(): string {
    return this.player.getPlayerId();
  }

  get playerName(): string {
    return this.player.getPlayerName();
  }

  getPlayerId(): string {
    return this.player.getPlayerId();
  }

  getPlayerName(): string {
    return this.player.getPlayerName();
  }
}