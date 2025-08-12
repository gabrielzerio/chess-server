export type PieceType = "pawn" | "rook" | "knight" | "bishop" | "queen" | "king";
export type PieceColor = "white" | "black";
export type ErrorCode = 'GAME_FULL' | 'PLAYER_ALREADY_EXISTS'
export type GameStatus = 'waiting' | 'playing' | 'ended' | 'checkmate' | 'paused_reconnect' | 'abandoned';

export interface Position {
  row: number;
  col: number;
}

export interface EnPassantTarget {
  row: number;
  col: number;


export interface GameAndPlayerID{
    gameID: string;
    playerID:string;
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



import { DecorateAcknowledgementsWithMultipleResponses, DefaultEventsMap } from 'socket.io/dist/typed-events';
// Import da classe base Piece
import { Piece } from '../class/piece';
import { BroadcastOperator } from 'socket.io';
export type Board = (Piece | null)[][];
