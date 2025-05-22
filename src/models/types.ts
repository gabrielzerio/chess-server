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

export interface Player{
 name: string; 
 color: PieceColor; 
 userID: string | null;
}

// Import da classe base Piece
import { Piece } from '../class/piece';
export type Board = (Piece | null)[][];
