import express, {Request, Response} from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import { createInitialBoard } from './utils/boardSetup';
import { PieceFactory } from './models/PieceFactory';
import { MoveContext, Piece } from './models/pieces/Piece';
import { PieceColor, Board } from './models/types';
import { Position, EnPassantTarget } from './models/types'; 
import { Pawn } from './models/pieces';


type Game = { players: { name: string; color: PieceColor; socketId: string | null }[]; board:Board ; turn: PieceColor; status: string };
type GamesMap = { //lista de jogos do tipo Game
  [gameId: string]: Game;
};
let enPassantTarget: EnPassantTarget | null = null;

// Initialize the express engine
const app: express.Application = express();

app.use(express.json());
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

let games: GamesMap = {};

app.post('/games', (req: Request, res: Response) => {
  const gameId = Math.random().toString(36).substr(2, 9);
  games[gameId] = {
    players: [],
    board: createInitialBoard(),
    turn:'white', // white começa
    status: 'waiting'
  };
  console.log(`Game created: ${gameId}`);
  res.json({ gameId });
});

app.post('/games/:gameId/join',(req: Request<{ gameId: string }, any, { playerName: string }>, res: Response):any => {
  const { gameId } = req.params;
  const { playerName } = req.body;
  if (!games[gameId]) return res.status(404).json({ error: 'Game not found' });
  if (games[gameId].players.length >= 2) return res.status(400).json({ error: 'Game full' });
  // Atribui cor automaticamente
  const color = games[gameId].players.length === 0 ? 'white' : 'black';
  games[gameId].players.push({ name: playerName, color, socketId: null });
  if (games[gameId].players.length === 2) games[gameId].status = 'playing';
  res.json({ success: true, color });
});

app.get('/games/:gameId/board', (req:Request, res:Response):any => {
   const { gameId } = req.params;
   if (!games[gameId]) return res.status(404).json({ error: 'Game not found' });
  // Serializa as peças para enviar ao front-end
  const serializedBoard = games[gameId].board.map(row =>
   row.map(piece =>
  piece
   ? { type: piece.type, color: piece.color, position: piece.position }
   : null
   )
  );
  res.json({ board: serializedBoard, turn: games[gameId].turn });
  });

// Função para desserializar o board (transforma objetos em instâncias das classes)
function deserializeBoard(serializedBoard: Board): Board {
  return serializedBoard.map((row, rowIdx) =>
    row.map((piece, colIdx) =>
      piece
        ? PieceFactory.createPiece(piece.type, piece.color, { row: rowIdx, col: colIdx })
        : null
    )
  );
}

// Novo endpoint: retorna movimentos possíveis para uma peça
app.post('/games/:gameId/moves', async (req: Request, res: Response):Promise<any> => {
  const { gameId } = req.params;
  const { from, playerName } = req.body; // { row, col }, playerName opcional
  const game = games[gameId];
  if (!game || !game.board) return res.status(404).json({ error: 'Game not found' });

  // Reconstrua o board se necessário
  if (!game.board[0][0]?.move) {
    game.board = deserializeBoard(game.board);
  }
  const piece:Piece|null = game.board[from.row][from.col];
  if (!piece) return res.json({ moves: [] });

  // Só permite mostrar movimentos da peça do jogador da vez
  if (piece.color !== game.turn) {
    return res.json({ moves: [] });
  }
  // Se playerName for enviado, valida se é o jogador correto
  if (playerName) {
    const player = game.players.find(p => p.name === playerName);
    if (!player || player.color !== game.turn) {
      return res.json({ moves: [] });
    }
  }

  // Chama o método getPossibleMoves (deve existir em cada peça)
  let possibleMoves:Position[] = [];	
  const context:MoveContext = { enPassantTarget };
  if (typeof piece.showPossibleMoves === 'function') {
    // Espera que showPossibleMoves retorne Position[]
    possibleMoves = piece.showPossibleMoves(game.board, context);
  }
  const normalMoves: Position[] = [];
const captureMoves: Position[] = [];

for (const move of possibleMoves) {
  const targetPiece = game.board[move.row][move.col];
  if (targetPiece && targetPiece.color !== piece.color) {
    captureMoves.push(move);
  } else if (!targetPiece) {
    normalMoves.push(move);
  }
}
res.json({ normalMoves, captureMoves });
});

// Socket.IO
io.on('connection', (socket) => {
  console.log('Novo cliente conectado:', socket.id);
  
  socket.on('join', ({ gameId, playerName }) => {
    if (!games[gameId]) {
      socket.emit('joinError', { message: 'Game not found' });
      return;
    }
    // Atualiza socketId do jogador
    const player = games[gameId].players.find(p => p.name === playerName);
    if (player) player.socketId = socket.id;
    socket.join(gameId);
    // Envia board atual e cor do jogador
    socket.emit('joined', {
      board: games[gameId].board.map(row =>
        row.map(piece =>
          piece
            ? { type: piece.type, color: piece.color, position: piece.position }
            : null
        )
      ),
      color: player ? player.color : null,
      turn: games[gameId].turn
    });
    io.to(gameId).emit('playersUpdate', { players: games[gameId].players });
  });

  socket.on('move', async ({ gameId, from, to, promotionType, playerName }) => {
    const game:Game = games[gameId];
    if (!game || !game.board) return;
    // Verifica se é a vez do jogador
    const player = game.players.find(p => p.name === playerName && p.socketId === socket.id);
    if (!player) {
      socket.emit('moveError', { message: 'Player not in game.' });
      return;
    }
    if (player.color !== game.turn) {
      socket.emit('moveError', { message: 'Not your turn.' });
      return;
    }
    // Reconstrua o board com instâncias reais
    if (!game.board[0][0]?.move) {
      console.log(game.board)
      game.board = deserializeBoard(game.board);
    }
    const piece = game.board[from.row][from.col];
    if (!piece) {
      socket.emit('moveError', { message: 'No piece at source.' });
      return;
    }
    if (piece.color !== player.color) {
      socket.emit('moveError', { message: 'You can only move your own pieces.' });
      return;
    }
    // Contexto para promoção
    const context:MoveContext = { enPassantTarget };	
    // if (promotionType) context.promotionType = promotionType;

    let moved = false;
    // só entra nesse if se for um peão e o movimento for para a última linha (0 ou 7)
    // e se o tipo de promoção for válido
    if (piece instanceof Pawn && (to.row === 0 || to.row === 7) && promotionType) {
    
      // Verifica se o movimento é válido
      if (typeof piece.move === 'function' && await piece.move(from, to, game.board, context)) {
        const newPiece = PieceFactory.createPiece(promotionType, piece.color, to);
        game.board[to.row][to.col] = newPiece;
        game.board[from.row][from.col] = null;
        moved = true;
      }
    } else if (typeof piece.move === 'function') {
      moved = await piece.move(from, to, game.board, context);
      if( piece instanceof Pawn && moved) {
         enPassantTarget = piece.getEnPassantTarget(from, to);
      }
      if (moved) {
       
        game.board[to.row][to.col] = piece;
        game.board[from.row][from.col] = null;
        piece.position = { ...to };
        
      }
    }
    console.log(enPassantTarget);
    if (moved) {
      // Alterna o turno
      game.turn = game.turn === 'white' ? 'black' : 'white';
      const serializedBoard = game.board.map(row =>
        row.map(piece =>
          piece
            ? { type: piece.type, color: piece.color, position: piece.position }
            : null
        )
      );
      io.to(gameId).emit('boardUpdate', { board: serializedBoard, turn: game.turn });
    } else {
      socket.emit('moveError', { message: 'Invalid move.' });
    }
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
    // Remove socketId dos jogadores desconectados
    Object.values(games).forEach((game: any) => {
      game.players.forEach((p: any) => {
        if (p.socketId === socket.id) p.socketId = null;
      });
    });
  });
});

server.listen(3001, () => console.log('API e WebSocket rodando na porta 3001'));
