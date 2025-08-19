import { PieceColor } from "../models/types";

export interface IGamePlayer {
  readonly playerId: string;
  readonly playerName: string;
  color: PieceColor;
  isOnline: boolean;
  disconnectedAt?: number;

  getPlayerId(): string;
  getPlayerName(): string;
}
