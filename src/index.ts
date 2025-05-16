import express, {Request, Response} from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import { Piece } from './class/piece';
import { games } from './gameStore';
import gameRoutes from './router/gameRoutes';

// import { registerSocketHandlers } from './socketHandlers';
// registerSocketHandlers(io);

// Initialize the express engine
const app: express.Application = express();

app.use(express.json());
app.use(cors());
app.use(gameRoutes);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// Socket.IO
io.on('connection', (socket) => {
  console.log('Novo cliente conectado:', socket.id);
  
  socket.on('join', ({ gameId, playerName }) => {
    if (!games[gameId]) {
      socket.emit('joinError', { message: 'Game not found' });
      return;
    }
   
    // Atualiza socketId do jogador, se ele já tiver entrado nessa partida anteriormente, mas não saiu do jogo (refresh por exemplo)
    const player = games[gameId].checkPlayerName(playerName);
    if (player) player.socketId = socket.id;
    socket.join(gameId);
    // Envia board atual e cor do jogador
    socket.emit('joined', {
      board: games[gameId].deserializeBoard(), color: player ? player.color : null, turn: games[gameId].turn
    });
    io.to(gameId).emit('playersUpdate', { players: games[gameId].players });
    socket.data.gameId = gameId;
  });

  socket.on('move', async ({ gameId, from, to, promotionType, playerName }) => {
    const game = games[gameId].existsGame();
    if (!game || !game.board) return;
    // Verifica se é a vez do jogador
    const player = game.checkPlayerRound(playerName, socket);
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
      game.board = game.deserializeBoard();
    }
    const piece:Piece|null = game.getSelectedPiece(from); 
    if (!piece) {
      socket.emit('moveError', { message: 'No piece at source.' });
      return;
    }
    if (piece.color !== player.color) {
      socket.emit('moveError', { message: 'You can only move your own pieces.' });
      return;
    }

    let moved = await game.canMove(piece, to, from, promotionType);    
   
    if (moved) {
      // Alterna o turno
      
      const serializedBoard = game.serializeBoard();
      
      io.to(gameId).emit('boardUpdate', { board: serializedBoard, turn: game.changeTurn() });
      

      if(game.verifyCheckMate()){
        io.to(gameId).emit('gameOver', { winner: player.color });
      }
    } else {
      socket.emit('moveError', { message: 'Invalid move.' });
    }
  });

  

  socket.on('disconnect', () => {
    
    // Remove socketId dos jogadores desconectados
    // Object.values(games).forEach((game: any) => {
    //   game.players.forEach((p: any) => {
    //     if (p.socketId === socket.id) p.socketId = null;
    //   });
    // });
    try{
      games[socket.data.gameId].removeSocketId(socket.id);
      console.log("jogador desconectado", socket.id)
    }catch(error){
      console.log("o game pode já ter sido excluido anteriormente!");
    }
  });
});

server.listen(3001, () => console.log('API e WebSocket rodando na porta 3001'));
