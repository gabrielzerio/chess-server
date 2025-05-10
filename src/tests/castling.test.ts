import { describe, it, expect, beforeEach } from 'vitest';
import { PieceFactory } from '../models/PieceFactory';
import { Board } from '../models/types';
import { King } from '../models/pieces/King';

describe('Castling Tests', () => {
  let board: Board;
  let king: King;

  beforeEach(() => {
    board = Array(8).fill(null).map(() => Array(8).fill(null));
  });

  it('should perform kingside castling (roque curto)', async () => {
    king = PieceFactory.createPiece('king', 'white', { row: 7, col: 4 }) as King;
    const rook = PieceFactory.createPiece('rook', 'white', { row: 7, col: 7 });
    board[7][4] = king;
    board[7][7] = rook;

    const moved = await king.move({ row: 7, col: 4 }, { row: 7, col: 6 }, board);
    expect(moved).toBe(true);
    expect(board[7][5]).toBe(rook);
    expect(board[7][7]).toBeNull();
    expect(rook.position).toEqual({ row: 7, col: 5 });
    expect(rook.hasMoved).toBe(true);
  });

  it('should perform queenside castling (roque longo)', async () => {
    king = PieceFactory.createPiece('king', 'white', { row: 7, col: 4 }) as King;
    const rook = PieceFactory.createPiece('rook', 'white', { row: 7, col: 0 });
    board[7][4] = king;
    board[7][0] = rook;

    const moved = await king.move({ row: 7, col: 4 }, { row: 7, col: 2 }, board);
    expect(moved).toBe(true);
    expect(board[7][3]).toBe(rook);
    expect(board[7][0]).toBeNull();
    expect(rook.position).toEqual({ row: 7, col: 3 });
    expect(rook.hasMoved).toBe(true);
  });
});
