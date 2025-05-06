import { PieceType, PieceColor, Position, Board, EnPassantTarget } from "./models/types";
import { PieceFactory } from './models/PieceFactory';
import { Piece } from "./models/pieces/Piece";
import { King } from "./models/pieces/King";
import { Pawn } from "./models/pieces/Pawn";

// Importações
import FunctionsFront from "./utils/frontUtils.js";
import FunctionsTutorial from "./tutorial.js";

const frontFunctions = new FunctionsFront();
const tutorialFunctions = new FunctionsTutorial;
// Estado do jogo
const board: Board = Array(8).fill(null).map(() => Array(8).fill(null));

const pieces: Piece[] = [
  // Peças pretas
  PieceFactory.createPiece('rook', 'black', { row: 0, col: 0 }),
  PieceFactory.createPiece('knight', 'black', { row: 0, col: 1 }),
  PieceFactory.createPiece('bishop', 'black', { row: 0, col: 2 }),
  PieceFactory.createPiece('queen', 'black', { row: 0, col: 3 }),
  PieceFactory.createPiece('king', 'black', { row: 0, col: 4 }),
  PieceFactory.createPiece('bishop', 'black', { row: 0, col: 5 }),
  PieceFactory.createPiece('knight', 'black', { row: 0, col: 6 }),
  PieceFactory.createPiece('rook', 'black', { row: 0, col: 7 }),
  ...Array(8).fill(null).map((_, i) => PieceFactory.createPiece('pawn', 'black', { row: 1, col: i })),
  ...Array(8).fill(null).map((_, i) => PieceFactory.createPiece('pawn', 'white', { row: 6, col: i })),
  PieceFactory.createPiece('rook', 'white', { row: 7, col: 0 }),
  PieceFactory.createPiece('knight', 'white', { row: 7, col: 1 }),
  PieceFactory.createPiece('bishop', 'white', { row: 7, col: 2 }),
  PieceFactory.createPiece('queen', 'white', { row: 7, col: 3 }),
  PieceFactory.createPiece('king', 'white', { row: 7, col: 4 }),
  PieceFactory.createPiece('bishop', 'white', { row: 7, col: 5 }),
  PieceFactory.createPiece('knight', 'white', { row: 7, col: 6 }),
  PieceFactory.createPiece('rook', 'white', { row: 7, col: 7 }),
];

// Variáveis de estado
let player1Name = ""; // peças brancas
let player2Name = ""; // peças pretas
let selectedPiece: Piece | null = null;
let selectedPosition: Position | null = null;
let currentColorTurn: PieceColor = "black";
let enPassantTarget: EnPassantTarget | null = null;

// Funções do jogo
function initializeBoard(): void {
  board.forEach((row) => row.fill(null));
  pieces.forEach((piece) => {
    const { row, col } = piece.position;
    board[row][col] = piece;
  });
}

export function pieceToSymbol(piece: Piece): string {
  const symbols = {
    rook: { white: "♖", black: "♜" },
    knight: { white: "♘", black: "♞" },
    bishop: { white: "♗", black: "♝" },
    queen: { white: "♕", black: "♛" },
    king: { white: "♔", black: "♚" },
    pawn: { white: "♙", black: "♟" },
  };
  return symbols[piece.type as PieceType][piece.color as PieceColor];
}

async function handleSquareClick(row: number, col: number): Promise<void> {
  const piece = board[row][col];
  const to: Position = { row, col };
  if (selectedPiece) {
    if (selectedPosition && await movePiece(selectedPiece, selectedPosition, to)) {
      toggleTurn();
      selectedPiece = null;
      selectedPosition = null;
    } else {
      selectedPiece = null;
      selectedPosition = null;
    }
  } else if (piece && piece.color === currentColorTurn) {
    selectedPiece = piece;
    selectedPosition = { row, col };
  }
}

async function movePiece(piece: Piece, from: Position, to: Position): Promise<boolean> {
  try {
    const originalPiece = board[to.row][to.col];
    const context: any = { enPassantTarget };
    if (piece instanceof Pawn) {
      context.showPromotionDialog = async (color: PieceColor, position: Position) => {
        return await frontFunctions.showPromotionDialog(color, position, pieceToSymbol);
      };
    }
    const success = await piece.move(from, to, board, context);

    if (success) {
      if (originalPiece) {
        removePiece(originalPiece);
        const index = pieces.indexOf(originalPiece);
        if (index > -1) pieces.splice(index, 1);
      }
      
      if (piece instanceof Pawn) {
        enPassantTarget = piece.getEnPassantTarget(from, to);
      }
      
      return true;
    }
  } catch (error) {
    // Error handling logic
  }
  
  return false;
}

function showPossibleMoves(piece: Piece, row: number, col: number): void {
  const context: any = { enPassantTarget };
  if (piece instanceof Pawn) {
    context.showPromotionDialog = async (color: PieceColor, position: Position) => {
      return await frontFunctions.showPromotionDialog(color, position, pieceToSymbol);
    };
  }
  const possibleMoves = piece.showPossibleMoves(board, context);
}

function toggleTurn(): void {
  currentColorTurn = currentColorTurn === "white" ? "black" : "white";
}

function positionToString(row: number, col: number): string {
  const letters = "abcdefgh";
  return `${letters[col]}${8 - row}`;
}

function showAlerts(): void {
  const currentKing = pieces.find(p => p.type === 'king' && p.color === currentColorTurn) as King;
  if (currentKing?.isInCheck(board)) {
    if (King.isCheckmate(currentKing, pieces, board)) {
      // End game logic
    }
  }
}