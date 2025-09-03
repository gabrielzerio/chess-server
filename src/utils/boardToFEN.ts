import { Board, FENOptions, PieceColor } from '../models/types';

const pieceToFEN = {
  pawn: { white: 'P', black: 'p' },
  knight: { white: 'N', black: 'n' },
  bishop: { white: 'B', black: 'b' },
  rook: { white: 'R', black: 'r' },
  queen: { white: 'Q', black: 'q' },
  king: { white: 'K', black: 'k' }
};


export function boardToFEN(board: Board, { turn = 'white', castling = '-', enPassant = '-', halfMove = 0, fullMove = 1, }: FENOptions = {}): string {
  let fen = '';

  // 1. Posição das peças
  for (let row = 0; row < 8; row++) {
    let empty = 0;
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece) {
        empty++;
      } else {
        if (empty > 0) {
          fen += empty;
          empty = 0;
        }
        fen += pieceToFEN[piece.type][piece.color];
      }
    }
    if (empty > 0) fen += empty;
    if (row < 7) fen += '/';
  }

  // 2. Turno
  fen += ` ${turn === 'white' ? 'w' : 'b'}`;

  // 3. Roques
  fen += ` ${castling}`;

  // 4. En passant
  fen += ` ${enPassant}`;

  // 5. Halfmove e 6. Fullmove
  fen += ` ${halfMove} ${fullMove}`;

  return fen;
}
