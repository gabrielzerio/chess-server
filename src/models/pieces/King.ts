import { Piece, MoveContext } from '../../class/piece';
import { Position, Board, PieceColor } from '../types';

export class King extends Piece {
  constructor(color: PieceColor, position: Position) {
    super('king', color, position, false);
  }

  protected isValidPattern(from: Position, to: Position, board: Board, context: MoveContext = {}): boolean {
    const rowDiff = Math.abs(to.row - from.row);
    const colDiff = Math.abs(to.col - from.col);

    // Movimento normal do rei
    if (rowDiff <= 1 && colDiff <= 1) {
      return true;
    }

    // Roque
    if (!this.hasMoved && rowDiff === 0 && colDiff === 2) {
      return this.isCastlingValid(from, to, board);
    }

    return false;
  }

  isValidMove(from: Position, to: Position, board: Board, context: MoveContext = {}): boolean {
    if (!this.isValidPattern(from, to, board, context)) {
      return false;
    }

    // Para o rei, precisamos verificar se a casa de destino não está sob ataque
    return this.isMoveSafe(from, to, board) && 
           !this.isSquareUnderAttack(to.row, to.col, this.color, board);
  }

  private isCastlingValid(from: Position, to: Position, board: Board): boolean {
    if (this.isInCheck(board)) return false;

    const isKingSide = to.col > from.col;
    const rookCol = isKingSide ? 7 : 0;
    const rook = board[from.row][rookCol];

    if (!rook || rook.type !== 'rook' || rook.hasMoved) return false;

    const pathCols = isKingSide ? [5, 6] : [3, 2, 1];
    const checkCols = isKingSide ? [5, 6] : [3, 2, 1];
    
    // Verifica se o caminho está livre
    if (pathCols.some(col => board[from.row][col] !== null)) return false;

    // Verifica se as casas do caminho estão sob ataque
    for (let col of checkCols) {
      if (this.isSquareUnderAttack(from.row, col, this.color, board)) {
        return false;
      }
    }

    return true;
  }

  isInCheck(board: Board): boolean {
    return this.isSquareUnderAttack(this.position.row, this.position.col, this.color, board);
  }

  private isSquareUnderAttack(row: number, col: number, kingColor: PieceColor, board: Board): boolean {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.color !== kingColor) {
          if (typeof piece.canAttackSquare === 'function') {
            if (piece.canAttackSquare({ row: r, col: c }, { row, col }, board)) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  static isCheckmate(king: King, pieces: Piece[], board: Board): boolean {

    if (!king.isInCheck(board)) {
      return false;
    }

    return !pieces
      .filter(p => p.color === king.color)
      .some(piece => {
        const { row, col } = piece.position;
          //itera o pieces, e para na primeira peça que pode salvar o rei
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            if (piece.isValidMove({ row, col }, { row: r, col: c }, board)) {
              const originalPiece = board[r][c];
              const originalPosition = { ...piece.position };

              board[row][col] = null;
              board[r][c] = piece;
              piece.position = { row: r, col: c };

              const stillInCheck = king.isInCheck(board);

              board[row][col] = piece;
              board[r][c] = originalPiece;
              piece.position = originalPosition;

              if (!stillInCheck) {
                return true;
              }
            }
          }
        }
        return false;
      });
  }

  handleCastling(from: Position, to: Position, board: Board): void {
    const colDiff = to.col - from.col;
    if (Math.abs(colDiff) !== 2) return;

    const isKingSide = colDiff > 0;
    const rookCol = isKingSide ? 7 : 0;
    const newRookCol = isKingSide ? 5 : 3;
    const rook = board[from.row][rookCol];

    if (rook) {
      board[from.row][rookCol] = null;
      board[from.row][newRookCol] = rook;
      rook.position = { row: from.row, col: newRookCol };
      rook.hasMoved = true;
    }
  }

  async move(from: Position, to: Position, board: Board, context: MoveContext = {}): Promise<boolean> {
    if (!this.isValidMove(from, to, board, context)) return false;

    const success = await super.move(from, to, board, context);
    if (!success) return false;

    this.handleCastling(from, to, board);
    return true;
  }

  canCastleKingSide(board: Board): boolean {
    if (this.hasMoved || this.isInCheck(board)) return false;

    const rook = board[this.position.row][7];
    if (!rook || rook.type !== 'rook' || rook.hasMoved) return false;

    // Verifica se o caminho está livre e não ameaçado
    const pathCols = [5, 6];
    return pathCols.every(col => {
      if (board[this.position.row][col] !== null) return false;

      // Simula o movimento do rei para cada casa do caminho
      const originalPosition = { ...this.position };
      board[this.position.row][this.position.col] = null;
      this.position = { row: this.position.row, col };
      board[this.position.row][col] = this;

      const isSquareSafe = !this.isInCheck(board);

      // Desfaz a simulação
      board[this.position.row][col] = null;
      this.position = originalPosition;
      board[this.position.row][this.position.col] = this;

      return isSquareSafe;
    });
  }

  canCastleQueenSide(board: Board): boolean {
    if (this.hasMoved || this.isInCheck(board)) return false;

    const rook = board[this.position.row][0];
    if (!rook || rook.type !== 'rook' || rook.hasMoved) return false;

    // Verifica se o caminho está livre e não ameaçado
    const pathCols = [3, 2, 1];
    return pathCols.every(col => {
      if (board[this.position.row][col] !== null) return false;

      // Não precisamos verificar a ameaça na casa da torre
      if (col === 1) return true;

      // Simula o movimento do rei para cada casa do caminho
      const originalPosition = { ...this.position };
      board[this.position.row][this.position.col] = null;
      this.position = { row: this.position.row, col };
      board[this.position.row][col] = this;

      const isSquareSafe = !this.isInCheck(board);

      // Desfaz a simulação
      board[this.position.row][col] = null;
      this.position = originalPosition;
      board[this.position.row][this.position.col] = this;

      return isSquareSafe;
    });
  }

  showPossibleMoves(board: Board): Position[] {
    const normalMoves = super.showPossibleMoves(board);
    
    if (!this.hasMoved && !this.isInCheck(board)) {
      // Adiciona posições de roque se válidas
      const row = this.position.row;
      if (this.isCastlingValid(this.position, { row, col: this.position.col + 2 }, board)) {
        normalMoves.push({ row, col: this.position.col + 2 });
      }
      if (this.isCastlingValid(this.position, { row, col: this.position.col - 2 }, board)) {
        normalMoves.push({ row, col: this.position.col - 2 });
      }
    }
    
    return normalMoves;
  }
}
