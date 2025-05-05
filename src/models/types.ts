export type PieceType = "pawn" | "rook" | "knight" | "bishop" | "queen" | "king";
export type PieceColor = "white" | "black";

export interface Position {
  row: number;
  col: number;
}

export interface EnPassantTarget {
  row: number;
  col: number;
}

// Import da classe base Piece
import { Piece } from './pieces/Piece';
export type Board = (Piece | null)[][];
