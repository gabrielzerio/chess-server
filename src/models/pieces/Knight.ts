import { Piece, MoveContext } from './Piece';
import { Position, Board } from '../types';

export class Knight extends Piece {
  constructor(color: 'white' | 'black', position: Position) {
    super('knight', color, position);
  }

  protected isValidPattern(from: Position, to: Position, board: Board, context: MoveContext = {}): boolean {
    const rowDiff = Math.abs(from.row - to.row);
    const colDiff = Math.abs(from.col - to.col);
    return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
  }
}
