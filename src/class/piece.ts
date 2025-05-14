import { Position, Board, PieceType, PieceColor } from '../models/types';
import { King } from '../models/pieces/King';

/**
 * Contexto especial para movimentos, como en passant.
 */
export interface MoveContext {
  enPassantTarget?: Position | null;
  // outros campos especiais podem ser adicionados aqui
}

/**
 * Classe abstrata que representa uma peça de xadrez.
 */
export abstract class Piece {
    

  constructor(
    public readonly type: PieceType,
    public readonly color: PieceColor,
    public position: Position,
    public hasMoved: boolean = false
  ) {}

  /**
   * Verifica se o movimento é válido para esta peça, considerando o contexto especial.
   */
  isValidMove(from: Position, to: Position, board: Board, context: MoveContext = {}): boolean {
    return this.isValidPattern(from, to, board, context) && this.isMoveSafe(from, to, board);
  }

  /**
   * Verifica se o padrão de movimento é válido para esta peça.
   */
  protected abstract isValidPattern(from: Position, to: Position, board: Board, context?: MoveContext): boolean;

  /**
   * Verifica se esta peça pode atacar uma casa (padrão de ataque, não necessariamente movimento legal).
   */
  public canAttackSquare(from: Position, to: Position, board: Board): boolean {
    return this.isValidPattern(from, to, board);
  }

  /**
   * Verifica se o movimento não coloca o rei em xeque.
   */
  protected isMoveSafe(from: Position, to: Position, board: Board): boolean {
    const targetPiece = board[to.row][to.col];
    if (targetPiece && targetPiece.color === this.color) {
      return false;
    }

    const king = this.findKing(this.color, board);
    if (!king) return true;

    return this.simulateMove(from, to, board, () => !king.isInCheck(board));
  }

  /**
   * Verifica se o caminho entre duas posições está bloqueado.
   */
  protected isPathBlocked(from: Position, to: Position, board: Board): boolean {
    const rowStep = Math.sign(to.row - from.row);
    const colStep = Math.sign(to.col - from.col);

    let row = from.row + rowStep;
    let col = from.col + colStep;

    while (row !== to.row || col !== to.col) {
      if (board[row][col] !== null) {
        return true;
      }
      row += rowStep;
      col += colStep;
    }
    return false;
  }

  /**
   * Move a peça para uma nova posição, se o movimento for válido.
   */
  async move(from: Position, to: Position, board: Board, context: MoveContext = {}): Promise<boolean> {
    if (!this.isValidMove(from, to, board, context)) return false;

    const originalPiece = board[to.row][to.col];
    const originalPosition = { ...this.position };

    board[from.row][from.col] = null;
    board[to.row][to.col] = this;
    this.position = { row: to.row, col: to.col };

    const king = this.findKing(this.color, board);
    if (king?.isInCheck(board)) {
      board[from.row][from.col] = this;
      board[to.row][to.col] = originalPiece;
      this.position = originalPosition;
      return false;
    }

    this.hasMoved = true;
    return true;
  }

  /**
   * Simula um movimento e executa um callback para verificar o resultado.
   */
  protected simulateMove(from: Position, to: Position, board: Board, callback: () => boolean): boolean {
    const originalPiece = board[to.row][to.col];
    const originalPosition = { ...this.position };

    board[from.row][from.col] = null;
    board[to.row][to.col] = this;
    this.position = to;

    const result = callback();

    board[from.row][from.col] = this;
    board[to.row][to.col] = originalPiece;
    this.position = originalPosition;

    return result;
  }

  /**
   * Retorna uma lista de posições possíveis para esta peça.
   */
  showPossibleMoves(board: Board, context: MoveContext = {}): Position[] {
    const possibleMoves: Position[] = [];
    
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const to = { row: r, col: c };
        if (this.isValidMove(this.position, to, board, context)) {
          possibleMoves.push(to);
        }
      }
    }
    
    return possibleMoves;
  }

  /**
   * Verifica se esta peça está em xeque.
   */
  isInCheck(board: Board): boolean {
    const king = this.findKing(this.color, board);
    return king ? king.isInCheck(board) : false;
  }

  // isCheckMate(king: King, pieces: Piece[], board: Board):boolean {
  //   return false;
  // }
  /**
   * Encontra o rei do mesmo time no tabuleiro.
   */
  protected findKing(color: PieceColor, board: Board): King | null {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece?.type === 'king' && piece.color === color) {
          return piece as King;
        }
      }
    }
    return null;
  }

  /**
   * Define o tipo da peça.
   */
  protected setType(newType: PieceType): void {
    Object.defineProperty(this, 'type', {
      value: newType,
      writable: false,
      configurable: true
    });
  }
}
