import { Piece, MoveContext } from '../../class/piece';
import { Position, Board } from '../types';

export class Rook extends Piece {
  constructor(color: 'white' | 'black', position: Position) {
    super('rook', color, position, false);
  }

  protected isValidPattern(from: Position, to: Position, board: Board, context: MoveContext = {}): boolean {
    const rowDiff = Math.abs(from.row - to.row);
    const colDiff = Math.abs(from.col - to.col);
    return (rowDiff === 0 || colDiff === 0) && !this.isPathBlocked(from, to, board);
  }
}
