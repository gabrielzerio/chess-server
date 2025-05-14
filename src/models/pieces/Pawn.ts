import { Piece, MoveContext } from '../../class/piece';
import { Position, Board, PieceType } from '../types';

export class Pawn extends Piece {
  constructor(color: 'white' | 'black', position: Position) {
    super('pawn', color, position);
  }

  protected isValidPattern(from: Position, to: Position, board: Board, context: MoveContext = {}): boolean {
    const direction = this.color === "white" ? -1 : 1;
    const startRow = this.color === "white" ? 6 : 1;
    const enPassantTarget = context.enPassantTarget;

    // Movimento para frente
    if (from.col === to.col && board[to.row][to.col] === null) {
      if (to.row === from.row + direction) return true;
      if (
        from.row === startRow &&
        to.row === from.row + 2 * direction &&
        board[from.row + direction][to.col] === null
      ) {
        return true;
      }
    }

    // Captura diagonal (incluindo en passant)
    if (Math.abs(from.col - to.col) === 1 && to.row === from.row + direction) {
      const targetPiece = board[to.row][to.col];
      if (targetPiece && targetPiece.color !== this.color) return true;
      if (
        enPassantTarget &&
        to.row === enPassantTarget.row &&
        to.col === enPassantTarget.col
      ) {
        return true;
      }
    }

    return false;
  }

  canAttackSquare(from: Position, to: Position, board: Board): boolean {
    const direction = this.color === "white" ? -1 : 1;
    // Peão ataca apenas na diagonal, independente de peça estar lá
    return (
      Math.abs(from.col - to.col) === 1 &&
      to.row === from.row + direction
    );
  }

  handleEnPassant(to: Position, capturedPawn: Piece | null, board: Board): void {
    if (!capturedPawn) return;
    const capturedPawnRow = this.color === "white" ? to.row + 1 : to.row - 1;
    board[capturedPawnRow][to.col] = null;
  }

  getEnPassantTarget(from: Position, to: Position): Position | null {
    if (Math.abs(from.row - to.row) === 2) {
      return { row: (from.row + to.row) / 2, col: to.col };
    }
    return null;
  }

  async move(from: Position, to: Position, board: Board, context: MoveContext = {}): Promise<boolean> {
    const success = await super.move(from, to, board, context);
    if (!success) return false;

    const enPassantTarget = context.enPassantTarget;
    const isEnPassantMove =
      enPassantTarget &&
      to.row === enPassantTarget.row &&
      to.col === enPassantTarget.col;
    if (isEnPassantMove) {
      const capturedPawnRow = this.color === "white" ? to.row + 1 : to.row - 1;
      board[capturedPawnRow][to.col] = null;
    }
    return true;
  }
}