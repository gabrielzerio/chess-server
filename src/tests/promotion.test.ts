import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PieceFactory } from '../models/PieceFactory';
import { Board, PieceType, PieceColor, Position } from '../models/types';
import { Pawn } from '../models/pieces/Pawn';

describe('Pawn Promotion', () => {
  let board: Board;

  beforeEach(() => {
    board = Array(8).fill(null).map(() => Array(8).fill(null));
  });

  it('should promote white pawn to queen', async () => {
    const pawn = PieceFactory.createPiece('pawn', 'white', { row: 1, col: 0 }) as Pawn;
    board[1][0] = pawn;

    const mockPromotionDialog = vi.fn().mockResolvedValue('queen' as PieceType);

    await pawn.move(
      { row: 1, col: 0 },
      { row: 0, col: 0 },
      board,
      { showPromotionDialog: mockPromotionDialog }
    );

    expect(board[0][0]?.type).toBe('queen');
    expect(mockPromotionDialog).toHaveBeenCalledWith('white', { row: 0, col: 0 });
  });
});
