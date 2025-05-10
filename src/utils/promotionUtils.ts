import { Piece } from '../models/pieces/Piece';
import { Board, Position, PieceType, PieceColor } from '../models/types';
import { PieceFactory } from '../models/PieceFactory';

export async function promotePawn(
  pawn: Piece,
  position: Position,
  board: Board,
  showPromotionDialog?: (color: PieceColor, position: Position) => Promise< PieceType >
): Promise<void> {
  if ((position.row === 0 || position.row === 7) && typeof showPromotionDialog === 'function') {
    const promotedPiece = await showPromotionDialog(pawn.color, position);
    if (!promotedPiece) {
      throw new Error('Promoção inválida: tipo de peça não definido.');
    }
    const newPiece = PieceFactory.createPiece(promotedPiece, pawn.color, position);
    board[position.row][position.col] = newPiece;
    // Não é necessário remover explicitamente o peão, pois ele é sobrescrito
  }
}