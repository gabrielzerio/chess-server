import { PieceFactory } from '../models/PieceFactory';
import type { Board } from '../models/types';
import type { Piece } from '../class/piece';

export function createInitialBoard(): Board {
  const board: Board = Array(8).fill(null).map(() => Array(8).fill(null));
  const pieces:Piece[] = [
    // Pretas
    PieceFactory.createPiece('rook', 'black', { row: 0, col: 0 }),
    PieceFactory.createPiece('knight', 'black', { row: 0, col: 1 }),
    PieceFactory.createPiece('bishop', 'black', { row: 0, col: 2 }),
    PieceFactory.createPiece('queen', 'black', { row: 0, col: 3 }),
    PieceFactory.createPiece('king', 'black', { row: 0, col: 4 }),
    PieceFactory.createPiece('bishop', 'black', { row: 0, col: 5 }),
    PieceFactory.createPiece('knight', 'black', { row: 0, col: 6 }),
    PieceFactory.createPiece('rook', 'black', { row: 0, col: 7 }),
    ...Array(8).fill(null).map((_, i) => PieceFactory.createPiece('pawn', 'black', { row: 1, col: i })),
    // Brancas
    ...Array(8).fill(null).map((_, i) => PieceFactory.createPiece('pawn', 'white', { row: 6, col: i })),
    PieceFactory.createPiece('rook', 'white', { row: 7, col: 0 }),
    PieceFactory.createPiece('knight', 'white', { row: 7, col: 1 }),
    PieceFactory.createPiece('bishop', 'white', { row: 7, col: 2 }),
    PieceFactory.createPiece('queen', 'white', { row: 7, col: 3 }),
    PieceFactory.createPiece('king', 'white', { row: 7, col: 4 }),
    PieceFactory.createPiece('bishop', 'white', { row: 7, col: 5 }),
    PieceFactory.createPiece('knight', 'white', { row: 7, col: 6 }),
    PieceFactory.createPiece('rook', 'white', { row: 7, col: 7 }),
  ];
  pieces.forEach(piece => {
    const { row, col } = piece.position;
    board[row][col] = piece;
  });
  return board;
}