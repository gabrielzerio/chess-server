import { Pawn, Rook, Knight, Bishop, Queen, King } from './pieces';
import { PieceType, PieceColor, Position } from './types';

export class PieceFactory {
  static createPiece(type: PieceType, color: PieceColor, position: Position) {
    switch (type) {
      case 'pawn': return new Pawn(color, position);
      case 'rook': return new Rook(color, position);
      case 'knight': return new Knight(color, position);
      case 'bishop': return new Bishop(color, position);
      case 'queen': return new Queen(color, position);
      case 'king': return new King(color, position);
      default: throw new Error(`Invalid piece type: ${type}`);
    }
  }
}
