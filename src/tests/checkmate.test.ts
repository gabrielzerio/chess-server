import { describe, it, expect, beforeEach } from 'vitest';
import { PieceFactory } from '../models/PieceFactory';
import { Board } from '../models/types';
import { King } from '../models/pieces/King';
import { Piece } from '../models/pieces/Piece';

describe('Checkmate situation', () => {
  let board: Board;
  let pieces: Piece[];
  let king: King;

  beforeEach(() => {
    board = Array(8).fill(null).map(() => Array(8).fill(null));
    pieces = [];
  });

  it('should detect checkmate', () => {
    king = PieceFactory.createPiece('king', 'white', { row: 7, col: 7 }) as King;
    const queen = PieceFactory.createPiece('queen', 'black', { row: 6, col: 6 });
    const rook = PieceFactory.createPiece('rook', 'black', { row: 7, col: 6 });
    board[7][7] = king;
    board[6][6] = queen;
    board[7][6] = rook;
    pieces.push(king, queen, rook);

    expect(King.isCheckmate(king, pieces, board)).toBe(true);
  });
});
