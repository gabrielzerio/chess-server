import { Piece, MoveContext } from '../../class/piece';
import { Position, Board } from '../types';

export class Bishop extends Piece {
  constructor(color: 'white' | 'black', position: Position) {
    super('bishop', color, position);
  }

  protected isValidPattern(from: Position, to: Position, board: Board, context: MoveContext = {}): boolean {
    const rowDiff = Math.abs(from.row - to.row);
    const colDiff = Math.abs(from.col - to.col);
    return rowDiff === colDiff && !this.isPathBlocked(from, to, board);
  }
}
