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

function createBoard(): void {
  const chessBoard = document.getElementById("board");
  if (!chessBoard) return;
  chessBoard.innerHTML = "";

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = document.createElement("div");
      const spanElement = document.createElement("span");
      spanElement.classList.add("piece");
      square.id = `${row}-${col}`;
      square.classList.add((row + col) % 2 === 0 ? "white-square" : "black-square");

      const piece = board[row][col];
      if (piece) {
        spanElement.textContent = pieceToSymbol(piece);
      }
      square.addEventListener("click", () => handleSquareClick(row, col));
      square.appendChild(spanElement);
      chessBoard.appendChild(square);
    }
  }
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
      showAlerts();
    } else {
      const moveInfo = document.getElementById("move-info");
      if (moveInfo) moveInfo.textContent = "Movimento inválido. Tente novamente.";
      bgPieceColoring(false);
      selectedPiece = null;
      selectedPosition = null;
      frontFunctions.removeHighlight();
    }
  } else if (piece && piece.color === currentColorTurn) {
    selectedPiece = piece;
    selectedPosition = { row, col };
    const moveInfo = document.getElementById("move-info");
    if (moveInfo) moveInfo.textContent = `Peça selecionada: ${pieceToSymbol(piece)} em ${positionToString(row, col).toUpperCase()}`;
    showPossibleMoves(piece, row, col);
    bgPieceColoring(true);
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
      
      movePieceAnimation(to, from);
      return true;
    }
  } catch (error) {
    const moveInfo = document.getElementById('move-info');
    if (moveInfo) moveInfo.textContent = error instanceof Error ? error.message : "An unknown error occurred.";
  }
  
  return false;
}

function movePieceAnimation(to: Position, from: Position): void {
  const pieceElement = document.getElementById(`${from.row}-${from.col}`)?.querySelector(".piece") as HTMLElement;
  if (!pieceElement) return;

  const squareSize = 80;
  const deltaX = (to.col - from.col) * squareSize;
  const deltaY = (to.row - from.row) * squareSize;

  pieceElement.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

  setTimeout(() => {
    pieceElement.style.transform = "";
    pieceElement.parentElement!.id = `${to.row}-${to.col}`;
    createBoard();
  }, 300);

  const moveInfo = document.getElementById('move-info');
  if (moveInfo) moveInfo.textContent = `Peça movida para ${positionToString(to.row, to.col).toUpperCase()}`;
}

function showPossibleMoves(piece: Piece, row: number, col: number): void {
  frontFunctions.removeHighlight();

  const context: any = { enPassantTarget };
  if (piece instanceof Pawn) {
    context.showPromotionDialog = async (color: PieceColor, position: Position) => {
      return await frontFunctions.showPromotionDialog(color, position, pieceToSymbol);
    };
  }
  const possibleMoves = piece.showPossibleMoves(board, context);
  console.log("Movimentos possíveis:", possibleMoves);

  possibleMoves.forEach(move => {
    const square = document.getElementById(`${move.row}-${move.col}`);
    if (square) {
      const targetPiece = board[move.row][move.col];
      square.classList.add(
        targetPiece && targetPiece.color !== piece.color ? 
        'capture-highlight' : 
        'highlight'
      );
    }
  });
}

function toggleTurn(): void {
  currentColorTurn = currentColorTurn === "white" ? "black" : "white";
  const turnInfo = document.getElementById("turn-info");
  if (turnInfo) {
    turnInfo.textContent = `Turno: ${currentColorTurn === "white" ? "Jogador Branco" : "Jogador Preto"}`;
  }
}

function bgPieceColoring(mov: boolean): void {
  if (!selectedPiece) return;
  
  const pecaSelecionada = document.getElementById(
    `${selectedPiece.position.row}-${selectedPiece.position.col}`
  );
  if (!pecaSelecionada) return;

  if (mov) {
    pecaSelecionada.style.backgroundColor = "lightyellow";
    return;
  }
  
  if (pecaSelecionada.className === "white-square") {
    pecaSelecionada.style.backgroundColor = "#f0d9b5";
  } else {
    pecaSelecionada.style.backgroundColor = "#b58863";
  }
}

function removePiece(target: Piece): void {
  const div = document.getElementById(`${target.color}-pieces`);
  if (!div) return;
  
  const span = document.createElement("span");
  span.innerHTML = pieceToSymbol(target);
  div.appendChild(span);
}

function positionToString(row: number, col: number): string {
  const letters = "abcdefgh";
  return `${letters[col]}${8 - row}`;
}

function showAlerts(): void {
  const currentKing = pieces.find(p => p.type === 'king' && p.color === currentColorTurn) as King;
  if (currentKing?.isInCheck(board)) {
    if (King.isCheckmate(currentKing, pieces, board)) {
      frontFunctions.showEndGame(player1Name, player2Name, currentColorTurn);
    } else {
      alert(`${currentColorTurn === "white" ? "Rei branco" : "Rei preto"} está em xeque!`);
    }
  }
}

toggleTurn();

window.onload = async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('mode');
  let opcao;
    if(mode==='default'){
      frontFunctions.showPlayersName(player1Name, player2Name);
      initializeBoard();
      createBoard();
    }
    else if(mode === 'tutorial'){
       opcao = await frontFunctions.showTutorial(); 
       if(opcao === 'knight'){
          const whitePawnPositions = Array.from({ length: 8 }, (_, col) => ({ row: 6, col}));
          tutorialFunctions.tutorialKnight(opcao, [{row: 1, col: 6},], [{row: 7, col: 1},], whitePawnPositions, pieces, board);
       }
       if(opcao === 'pawn'){
          tutorialFunctions.movePieceTo(opcao, [{row: 1, col: 6},], [{row: 6, col: 4},], pieces, board);           
       }
 
       createBoard();
    }
};