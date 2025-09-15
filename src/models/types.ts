import { GamePlayer } from '../class/GamePlayer';
// Import da classe base Piece
import { Piece } from '../class/piece';

export type PieceType = "pawn" | "rook" | "knight" | "bishop" | "queen" | "king";
export type PieceColor = "white" | "black";
export type ErrorCode = 'GAME_FULL' | 'PLAYER_ALREADY_EXISTS'
export type GameStatus = 'first_movement' | 'waiting' | 'playing' | 'ended' | 'checkmate' | 'paused_reconnect' | 'abandoned';
export type Board = (Piece | null)[][];
export type DisconnectResult = { status: string; playerWinner: string; message: string; };

export interface Position {
  row: number;
  col: number;
}

export interface EnPassantTarget {
  row: number;
  col: number;
}

export interface GameAndPlayerID {
  gameId: string;
  playerId: string;
}

export class GameError extends Error {
  constructor(message: string, public code: string, public statusCode: number = 400) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, GameError.prototype);
  }
}

export class GameFullError extends GameError {
  constructor(message: string = 'Game is full.') {
    super(message, 'GAME_FULL', 400);
    Object.setPrototypeOf(this, GameFullError.prototype);
  }
}

export class PlayerAlreadyExistsError extends GameError {
  constructor(message: string = 'Player already in game.') {
    super(message, 'PLAYER_ALREADY_EXISTS', 400);
    Object.setPrototypeOf(this, PlayerAlreadyExistsError.prototype);
  }
}

export interface ApplyMoveResult {
  success: boolean;
  message?: string;
  board?: any;
  turn?: PieceColor;
  status?: GameStatus;
  winner?: GamePlayer;
  isCheck?: boolean;
  san?: string;
}

export interface IGame {
  playerWhite: string;
  playerBlack: string;
  winner: string;
  roomCode: string;
  pgn: string;
}

export interface FENOptions {
  turn?: PieceColor;           // Quem joga
  castling?: string;           // Ex.: "KQkq", "KQ", "-"
  enPassant?: string;          // Ex.: "e3", "-"
  halfMove?: number;           // Contagem de meios-lances
  fullMove?: number;           // Número do lance completo
}