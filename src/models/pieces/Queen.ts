import { Piece, MoveContext } from './Piece';
import { Position, Board } from '../types';
import { isStraightLine, isDiagonal } from '../../utils/movePatterns';

export class Queen extends Piece {
  constructor(color: 'white' | 'black', position: Position) {
    super('queen', color, position);
  }

  protected isValidPattern(from: Position, to: Position, board: Board, context: MoveContext = {}): boolean {
    return (isStraightLine(from, to) || isDiagonal(from, to)) && !this.isPathBlocked(from, to, board);
  }
}
