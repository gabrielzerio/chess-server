import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import { createInitialBoard } from './utils/boardSetup';
import { PieceFactory } from './models/PieceFactory';

// Initialize the express engine
const app: express.Application = express();
app.use(express.json());
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

let games: any = {}; // { [gameId]: { players: [{name, color, socketId}], board, turn, ... } }

app.post('/games', (req, res) => {
  const gameId = Math.random().toString(36).substr(2, 9);
  games[gameId] = {
    players: [],
    board: createInitialBoard(),
    turn: 'white', // white começa
    status: 'waiting'
  };
  console.log(`Game created: ${gameId}`);
  res.json({ gameId });
});

app.post('/games/:gameId/join', (req, res) => {
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

app.get('/games/:gameId/board', (req, res) => {
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
function deserializeBoard(serializedBoard) {
  return serializedBoard.map((row, rowIdx) =>
    row.map((piece, colIdx) =>
      piece
        ? PieceFactory.createPiece(piece.type, piece.color, { row: rowIdx, col: colIdx })
        : null
    )
  );
}

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
    const game = games[gameId];
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
    const context = {};
    if (promotionType) context.promotionType = promotionType;

    let moved = false;
    // Promoção de peão
    if (piece.type === 'pawn' && (to.row === 0 || to.row === 7) && promotionType) {
      // Verifica se o movimento é válido
      if (typeof piece.move === 'function' && await piece.move(from, to, game.board, context)) {
        const newPiece = PieceFactory.createPiece(promotionType, piece.color, to);
        game.board[to.row][to.col] = newPiece;
        game.board[from.row][from.col] = null;
        moved = true;
      }
    } else if (typeof piece.move === 'function') {
      moved = await piece.move(from, to, game.board, context);
      if (moved) {
        game.board[to.row][to.col] = piece;
        game.board[from.row][from.col] = null;
        piece.position = { ...to };
      }
    }

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
