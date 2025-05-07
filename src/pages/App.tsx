import React, { useState, useRef, useEffect } from "react";
import { io, Socket } from "socket.io-client";

type PieceColor = "white" | "black";
type PieceType = "rook" | "knight" | "bishop" | "queen" | "king" | "pawn";
interface Position { row: number; col: number; }
interface Piece {
  type: PieceType;
  color: PieceColor;
  position: Position;
}

const pieceSymbols: Record<PieceType, Record<PieceColor, string>> = {
  rook: { white: "♖", black: "♜" },
  knight: { white: "♘", black: "♞" },
  bishop: { white: "♗", black: "♝" },
  queen: { white: "♕", black: "♛" },
  king: { white: "♔", black: "♚" },
  pawn: { white: "♙", black: "♟" },
};

const initialBoard: (Piece | null)[][] = Array(8)
  .fill(null)
  .map(() => Array(8).fill(null));

async function createGame() {
  const response = await fetch('http://localhost:3001/games', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  const data = await response.json();
  return data.gameId;
}

async function joinGame(gameId: string, playerName: string) {
  const response = await fetch(`http://localhost:3001/games/${gameId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerName })
  });
  return await response.json();
}

export const ChessGame: React.FC = () => {
  // Estados principais
  const [board, setBoard] = useState<(Piece | null)[][]>(initialBoard);
  const [deadPieces, setDeadPieces] = useState<{ white: Piece[]; black: Piece[] }>({ white: [], black: [] });
  const [selected, setSelected] = useState<Position | null>(null);
  const [turn, setTurn] = useState<PieceColor>("white");
  const [moveInfo, setMoveInfo] = useState("Clique em uma peça para mover");
  const [hint, setHint] = useState("");
  const [highlights, setHighlights] = useState<Position[]>([]);
  const [captureHighlights, setCaptureHighlights] = useState<Position[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [playerColor, setPlayerColor] = useState<PieceColor | null>(null);
  // Modais
  const [promotionModal, setPromotionModal] = useState<{ open: boolean; position?: Position; color?: PieceColor; squareRect?: DOMRect }>(
    { open: false }
  );
  const [endGameModal, setEndGameModal] = useState<{ open: boolean; winner?: string }>({ open: false });
  const [playerNamesModal, setPlayerNamesModal] = useState(true);
  const [tutorialModal, setTutorialModal] = useState(false);
  const [joinOrCreateModal, setJoinOrCreateModal] = useState(true);
  // Nomes dos jogadores
  const [player1, setPlayer1] = useState("");
  const [player2, setPlayer2] = useState("");
  const [joinGameId, setJoinGameId] = useState("");
  const [joinPlayerName, setJoinPlayerName] = useState("");
  const [createPlayerName, setCreatePlayerName] = useState("");
  // Tutorial
  const [tutorialPiece, setTutorialPiece] = useState<PieceType | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);

  // refs para posicionamento do modal de promoção
  const boardRefs = useRef<(HTMLDivElement | null)[][]>(
    Array(8).fill(null).map(() => Array(8).fill(null))
  );

  // Previne fechar modais com ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (playerNamesModal || tutorialModal || promotionModal.open || endGameModal.open) {
        if (e.key === "Escape") e.preventDefault();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [playerNamesModal, tutorialModal, promotionModal.open, endGameModal.open]);

  // Exemplo de inicialização do board (adicione sua lógica real)
  useEffect(() => {
    // setBoard(...);
  }, []);

  useEffect(() => {
    if (!gameId) return;
    // Corrige: envia também o nome do jogador ao entrar na sala
    const playerName = player1 || createPlayerName || joinPlayerName;
    const s = io("ws://localhost:3001");
    s.on("connect", () => {
      s.emit("join", { gameId, playerName });
    });
    s.on("joined", ({ board, color, turn }) => {
      setBoard(board);
      setPlayerColor(color);
      setTurn(turn);
      setMoveInfo(color ? `Você está jogando de ${color === "white" ? "brancas" : "pretas"}` : "");
    });
    s.on("boardUpdate", ({ board, turn }) => {
      setBoard(board);
      setTurn(turn);
    });
    s.on("moveError", ({ message }) => {
      alert(message);
    });
    setSocket(s);
    return () => {
      s.disconnect();
    };
  }, [gameId, player1, createPlayerName, joinPlayerName]);

  // Buscar o board inicial do back-end quando gameId mudar
  useEffect(() => {
    if (!gameId) return;
    fetch(`http://localhost:3001/games/${gameId}/board`)
      .then(res => res.json())
      .then(data => {
        setBoard(data.board);
        setTurn(data.turn);
      });
  }, [gameId]);

  // Utilitário: remove destaques
  const removeHighlight = () => {
    setHighlights([]);
    setCaptureHighlights([]);
  };

  // Utilitário: pode capturar peça inimiga?
  const canCaptureEnemyPiece = (piece: Piece, to: Position) => {
    const target = board[to.row][to.col];
    return target && target.color !== piece.color;
  };

  // Clique no tabuleiro
  const handleSquareClick = (row: number, col: number) => {
    setMoveInfo(`Clicou em ${String.fromCharCode(65 + col)}${8 - row}`);
    if (selected && (selected.row !== row || selected.col !== col)) {
      // Só permite mover se for a vez do jogador
      if (playerColor && turn === playerColor) {
        sendMove(selected, { row, col });
      } else {
        setMoveInfo("Aguarde sua vez.");
      }
      setSelected(null);
    } else {
      setSelected({ row, col });
    }
  };

  // Função para enviar movimento ao servidor (corrigida)
  function sendMove(from: Position, to: Position, promotionType?: PieceType) {
    if (!playerColor) {
      setMoveInfo("Você não está em uma partida ativa.");
      return;
    }
    const playerName = player1 || createPlayerName || joinPlayerName;
    socket?.emit('move', { gameId, from, to, promotionType, playerName });
  }

  // Modal de promoção
  const showPromotionDialog = (color: PieceColor, position: Position) => {
    const square = boardRefs.current[position.row][position.col];
    const squareRect = square?.getBoundingClientRect();
    setPromotionModal({ open: true, color, position, squareRect });
    return new Promise<PieceType>((resolve) => {
      // handlerPromotion resolve a promise
      const handlerPromotion = (type: PieceType) => {
        setPromotionModal({ open: false });
        resolve(type);
      };
      (window as any).handlePromotion = handlerPromotion;
    });
  };

  // Modal de fim de jogo
  const showEndGame = (winnerColor: PieceColor) => {
    setEndGameModal({ open: true, winner: winnerColor === "white" ? player1 : player2 });
  };

  // Modal de nomes dos jogadores
  const handleStartGame = () => {
    setPlayerNamesModal(false);
    setMoveInfo(`Vez de ${turn === "white" ? player1 : player2}`);
  };

  // Modal de tutorial
  const handleTutorialSelect = (type: PieceType) => {
    setTutorialPiece(type);
    setTutorialModal(false);
    // lógica para iniciar tutorial da peça
  };

  // Modal de promoção: handler
  const handlePromotion = (type: PieceType) => {
    setPromotionModal({ open: false });
    if ((window as any).handlePromotion) (window as any).handlePromotion(type);
  };

  // Modal de reinício
  const handleRestart = () => {
    setEndGameModal({ open: false });
    // setBoard(...);
    // setDeadPieces({ white: [], black: [] });
    // setTurn("white");
    // setMoveInfo("Clique em uma peça para mover");
  };

  // Novo: fluxo para criar jogo
  const handleCreateGame = async () => {
    if (!createPlayerName) return;
    const id = await createGame();
    await joinGame(id, createPlayerName);
    setGameId(id);
    setPlayer1(createPlayerName);
    setPlayerNamesModal(false);
    setJoinOrCreateModal(false);
    setMoveInfo(`Aguardando outro jogador entrar... (ID: ${id})`);
    // Aqui você pode aguardar o segundo jogador via websocket depois
  };

  // Novo: fluxo para entrar em jogo existente
  const handleJoinGame = async () => {
    if (!joinGameId || !joinPlayerName) return;
    const result = await joinGame(joinGameId, joinPlayerName);
    if (result.success) {
      setGameId(joinGameId);
      setPlayer2(joinPlayerName);
      setPlayerNamesModal(false);
      setJoinOrCreateModal(false);
      setMoveInfo(`Entrou no jogo ${joinGameId}`);
      // Aqui você pode buscar o estado do jogo e conectar websocket
    } else {
      setMoveInfo("Erro ao entrar no jogo.");
    }
  };

  // Render
  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      {/* Modal inicial: criar ou entrar em jogo */}
      {joinOrCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl border-4 border-neutral-800 shadow-xl flex flex-col gap-6 items-center min-w-[350px]">
            <h2 className="font-serif text-xl font-bold mb-2">Bem-vindo ao Xadrez Online</h2>
            <div className="w-full">
              <h3 className="font-bold mb-2">Criar novo jogo</h3>
              <input
                className="border-2 border-neutral-800 rounded px-4 py-2 mb-2 w-full"
                value={createPlayerName}
                onChange={e => setCreatePlayerName(e.target.value)}
                placeholder="Seu nome"
              />
              <button
                className="bg-green-700 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-900 w-full"
                onClick={handleCreateGame}
              >
                Criar Jogo
              </button>
            </div>
            <div className="w-full border-t border-gray-300 pt-4">
              <h3 className="font-bold mb-2">Entrar em jogo existente</h3>
              <input
                className="border-2 border-neutral-800 rounded px-4 py-2 mb-2 w-full"
                value={joinGameId}
                onChange={e => setJoinGameId(e.target.value)}
                placeholder="ID do jogo"
              />
              <input
                className="border-2 border-neutral-800 rounded px-4 py-2 mb-2 w-full"
                value={joinPlayerName}
                onChange={e => setJoinPlayerName(e.target.value)}
                placeholder="Seu nome"
              />
              <button
                className="bg-blue-700 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-900 w-full"
                onClick={handleJoinGame}
              >
                Entrar no Jogo
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-12 grid-cols-1 md:grid-cols-3 p-8" id="main-grid">
        {/* Dead Pieces */}
        <div className="dead-pieces flex flex-col justify-between p-5 h-[500px] w-[200px] rounded-lg text-4xl bg-neutral-600 self-center md:justify-self-end">
          <div id="black-pieces" className="flex flex-wrap">
            {deadPieces.black.map((p, i) => (
              <span key={i}>{pieceSymbols[p.type][p.color]}</span>
            ))}
          </div>
          <div id="white-pieces" className="flex flex-wrap">
            {deadPieces.white.map((p, i) => (
              <span key={i}>{pieceSymbols[p.type][p.color]}</span>
            ))}
          </div>
        </div>

        {/* Chess Board & Info */}
        <div className="chess-container flex flex-col gap-5 w-fit">
          <div id="turn-info" className="bg-yellow-100 p-5 text-lg text-center rounded-lg">
            {playerColor
              ? (turn === playerColor
                  ? "Sua vez"
                  : "Aguardando adversário")
              : `Turno: ${turn === "white" ? player1 || "Jogador Branco" : player2 || "Jogador Preto"}`}
          </div>
          <div>
            <div id="board-wrapper" className="flex items-center">
              {/* Board */}
              <div
                id="board"
                className="grid grid-cols-8 grid-rows-8 border-4 border-neutral-800 relative"
                style={{ width: 800, height: 800 }}
              >
                {board.map((rowArr, row) =>
                  rowArr.map((piece, col) => {
                    const isHighlight = highlights.some(pos => pos.row === row && pos.col === col);
                    const isCapture = captureHighlights.some(pos => pos.row === row && pos.col === col);
                    return (
                      <div
                        key={`${row}-${col}`}
                        id={`${row}-${col}`}
                        ref={el => (boardRefs.current[row][col] = el)}
                        className={`
                          w-[100px] h-[100px] flex items-center justify-center relative
                          ${(row + col) % 2 === 0 ? "bg-yellow-100" : "bg-yellow-700"}
                          cursor-pointer
                          ${isHighlight ? "highlight" : ""}
                          ${isCapture ? "capture-highlight" : ""}
                        `}
                        onClick={() => handleSquareClick(row, col)}
                      >
                        <span className="piece absolute text-4xl select-none pointer-events-none">
                          {piece ? pieceSymbols[piece.type][piece.color] : ""}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
              {/* Y Coordinates */}
              <div className="y-coordinates grid grid-rows-8 ml-2 text-lg font-bold text-neutral-800 text-center items-center">
                {[8, 7, 6, 5, 4, 3, 2, 1].map((n) => (
                  <div key={n}>{n}</div>
                ))}
              </div>
            </div>
            {/* X Coordinates */}
            <div className="x-coordinates grid grid-cols-8 mt-2 text-lg font-bold text-neutral-800 text-center">
              {["A", "B", "C", "D", "E", "F", "G", "H"].map((l) => (
                <div key={l}>{l}</div>
              ))}
            </div>
            {/* Info Panel */}
            <div className="info-panel text-center mt-2">
              <p id="move-info" className="text-2xl h-8 mb-2">{moveInfo}</p>
              <p id="hint" className="text-base text-green-700">{hint}</p>
            </div>
          </div>
        </div>

        {/* Modals */}
        {/* Promotion Modal */}
        {promotionModal.open && (
          <div
            className="fixed z-50"
            style={{
              left: promotionModal.squareRect?.left,
              top: promotionModal.color === "white"
                ? (promotionModal.squareRect?.top ?? 0) - 60
                : (promotionModal.squareRect?.bottom ?? 0),
              position: "absolute"
            }}
          >
            <div className="bg-yellow-100 border-2 border-yellow-700 rounded-lg p-6 shadow-lg">
              <h2 className="font-serif text-xl font-bold mb-4">Escolha uma peça para promoção</h2>
              <div className="flex gap-4 justify-center">
                {(["queen", "rook", "bishop", "knight"] as PieceType[]).map((type) => (
                  <button
                    key={type}
                    className="text-3xl w-12 h-12 p-1 cursor-pointer bg-yellow-100 border border-yellow-700 rounded hover:bg-yellow-700 hover:text-yellow-100"
                    onClick={() => handlePromotion(type)}
                  >
                    {pieceSymbols[type][promotionModal.color!]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* End Game Modal */}
        {endGameModal.open && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gradient-to-b from-gray-100 to-gray-300 p-8 rounded-xl border-4 border-neutral-800 shadow-xl flex flex-col gap-4 items-center">
              <h2 className="font-serif text-2xl font-bold">Fim de Jogo!</h2>
              <p id="winnerMessage">{endGameModal.winner}</p>
              <button
                className="bg-neutral-800 text-white px-6 py-2 rounded-lg font-bold hover:bg-yellow-600 hover:text-neutral-900"
                onClick={handleRestart}
              >
                Jogar Novamente
              </button>
            </div>
          </div>
        )}

        {/* Player Names Modal */}
        {playerNamesModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-xl border-4 border-neutral-800 shadow-xl flex flex-col gap-4 items-center">
              <h2 className="font-serif text-xl font-bold mb-4">Digite os nomes dos jogadores</h2>
              <input
                className="border-2 border-neutral-800 rounded px-4 py-2 mb-2"
                value={player1}
                onChange={e => setPlayer1(e.target.value)}
                placeholder="Jogador das peças brancas"
              />
              <input
                className="border-2 border-neutral-800 rounded px-4 py-2 mb-2"
                value={player2}
                onChange={e => setPlayer2(e.target.value)}
                placeholder="Jogador das peças pretas"
              />
              <button
                className="bg-neutral-800 text-white px-6 py-2 rounded-lg font-bold hover:bg-yellow-600 hover:text-neutral-900"
                onClick={handleStartGame}
              >
                Começar Jogo
              </button>
            </div>
          </div>
        )}

        {/* Tutorial Modal */}
        {tutorialModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-xl border-4 border-neutral-800 shadow-xl flex flex-col gap-4 items-center">
              <h2 className="font-serif text-xl font-bold mb-4">Escolha uma peça para o tutorial</h2>
              <div className="flex gap-4">
                {(["pawn", "rook", "queen", "bishop", "knight"] as PieceType[]).map(type => (
                  <button
                    key={type}
                    className="text-3xl w-12 h-12 p-1 cursor-pointer bg-yellow-100 border border-yellow-700 rounded hover:bg-yellow-700 hover:text-yellow-100"
                    onClick={() => handleTutorialSelect(type)}
                  >
                    {pieceSymbols[type]["white"]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChessGame;